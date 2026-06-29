import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPolarSignatureHeader,
  getEventModifiedAt,
  getPolarTierUpdate,
  isNewerEvent,
  signPolarWebhookPayload,
  verifyPolarSignature,
} from "../lib/billing/polar";

const USER_ID = "9d48d512-1ec5-45e8-b75d-3e1e93cfe817";

// Mocks for the webhook route's external boundaries. NextResponse is reduced to a tiny
// shape; the admin Supabase client only needs `rpc` (and a `from` we assert is NEVER
// called, to prove the multi-step pre-commit was removed).
const { rpcMock, fromMock } = vi.hoisted(() => ({ rpcMock: vi.fn(), fromMock: vi.fn() }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

vi.mock("../lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock, from: fromMock }),
}));

// Imported after the mocks above are registered (vi.mock is hoisted regardless).
import { POST } from "../app/api/polar/webhook/route";

const WEBHOOK_SECRET = Buffer.from("whsec_route_test").toString("base64");

function buildSignedRequest(eventBody: Record<string, unknown>) {
  const payload = JSON.stringify(eventBody);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const webhookId = "wh_route_1";
  const signature = signPolarWebhookPayload({ payload, secret: WEBHOOK_SECRET, timestamp, webhookId });
  const header = buildPolarSignatureHeader({ timestamp, webhookId, signatures: [signature] });

  return new Request("https://app.test/api/polar/webhook", {
    method: "POST",
    headers: {
      "webhook-id": webhookId,
      "webhook-timestamp": timestamp,
      "webhook-signature": header,
    },
    body: payload,
  });
}

describe("polar webhook tier mapping", () => {
  it("maps active subscription events to a pro tier update", () => {
    expect(
      getPolarTierUpdate({
        type: "subscription.active",
        data: {
          metadata: { user_id: USER_ID },
          customer: { metadata: { user_id: "ignored" } },
        },
      }),
    ).toEqual({ userId: USER_ID, tier: "pro" });
  });

  it("does NOT demote on subscription.canceled (scheduled cancel keeps paid period)", () => {
    // Polar fires subscription.canceled when the user schedules cancel-at-period-end.
    // Access must remain until the period actually ends (revoked), to avoid MoR refund disputes.
    expect(
      getPolarTierUpdate({
        type: "subscription.canceled",
        data: { customer: { external_id: USER_ID } },
      }),
    ).toBeNull();
  });

  it("demotes to free only on subscription.revoked", () => {
    expect(
      getPolarTierUpdate({
        type: "subscription.revoked",
        data: { external_customer_id: USER_ID },
      }),
    ).toEqual({ userId: USER_ID, tier: "free" });
  });

  it("demotes on confirmed-failure statuses but keeps pro during dunning", () => {
    // Confirmed failures -> free.
    for (const status of ["canceled", "unpaid", "incomplete_expired", "revoked"]) {
      expect(
        getPolarTierUpdate({
          type: "subscription.updated",
          data: { status, external_customer_id: USER_ID },
        }),
      ).toEqual({ userId: USER_ID, tier: "free" });
    }

    // Dunning / pending statuses -> no tier change (grace period), keep current tier.
    for (const status of ["past_due", "incomplete"]) {
      expect(
        getPolarTierUpdate({
          type: "subscription.updated",
          data: { status, external_customer_id: USER_ID },
        }),
      ).toBeNull();
    }
  });

  it("grants pro only when the product matches POLAR_PRO_PRODUCT_ID", () => {
    const matching = getPolarTierUpdate(
      {
        type: "subscription.active",
        data: { product_id: "prod_pro", metadata: { user_id: USER_ID } },
      },
      { proProductId: "prod_pro" },
    );
    expect(matching).toEqual({ userId: USER_ID, tier: "pro" });

    // price.product_id nesting is also honored.
    const matchingNested = getPolarTierUpdate(
      {
        type: "subscription.active",
        data: { price: { product_id: "prod_pro" }, metadata: { user_id: USER_ID } },
      },
      { proProductId: "prod_pro" },
    );
    expect(matchingNested).toEqual({ userId: USER_ID, tier: "pro" });

    // Different product subscription must NOT grant pro.
    const mismatch = getPolarTierUpdate(
      {
        type: "subscription.active",
        data: { product_id: "prod_other", metadata: { user_id: USER_ID } },
      },
      { proProductId: "prod_pro" },
    );
    expect(mismatch).toBeNull();
  });

  it("falls back to active status when event naming differs", () => {
    expect(
      getPolarTierUpdate({
        type: "subscription.updated",
        data: {
          status: "active",
          customer: { metadata: { supabase_user_id: USER_ID } },
        },
      }),
    ).toEqual({ userId: USER_ID, tier: "pro" });
  });

  it("returns the same upsert payload for duplicate webhook deliveries", () => {
    const event = {
      id: "evt_duplicate",
      type: "subscription.active",
      data: { metadata: { userId: USER_ID } },
    };

    expect(getPolarTierUpdate(event)).toEqual(getPolarTierUpdate(event));
  });

  it("ignores unsupported events or events without a user mapping", () => {
    expect(getPolarTierUpdate({ type: "order.paid", data: { metadata: { user_id: USER_ID } } })).toBeNull();
    expect(getPolarTierUpdate({ type: "subscription.active", data: { metadata: {} } })).toBeNull();
  });
});

describe("polar webhook route — single transactional RPC", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    process.env.POLAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
    delete process.env.POLAR_PRO_PRODUCT_ID;
  });

  afterEach(() => {
    delete process.env.POLAR_WEBHOOK_SECRET;
  });

  it("applies a subscription event through one apply_subscription_event RPC", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });

    const request = buildSignedRequest({
      type: "subscription.active",
      data: { metadata: { user_id: USER_ID }, modified_at: "2026-06-29T00:00:00Z" },
    });

    const response = (await POST(request)) as { body: { received: boolean }; status: number };

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
    // Exactly one DB call, and it is the transactional RPC — no pre-committed idempotency insert.
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledWith("apply_subscription_event", {
      p_event_id: "wh_route_1",
      p_user_id: USER_ID,
      p_tier: "pro",
      p_modified_at: "2026-06-29T00:00:00Z",
    });
  });

  it("acknowledges a duplicate delivery (RPC returns false) without a 500", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });

    const response = (await POST(
      buildSignedRequest({ type: "subscription.active", data: { metadata: { user_id: USER_ID } } }),
    )) as { body: { received: boolean; duplicate?: boolean }; status: number };

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
    expect(response.body.duplicate).toBe(true);
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns 500 when the RPC fails so Polar retries (no idempotency key pre-committed)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "db unavailable" } });

    const response = (await POST(
      buildSignedRequest({ type: "subscription.revoked", data: { external_customer_id: USER_ID } }),
    )) as { body: { error?: string }; status: number };

    expect(response.status).toBe(500);
    // The route must not have committed the webhook id itself via a separate insert.
    expect(fromMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("forwards tier=null events (e.g. scheduled cancel) so the RPC still records the id", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });

    await POST(buildSignedRequest({ type: "subscription.canceled", data: { external_customer_id: USER_ID } }));

    expect(rpcMock).toHaveBeenCalledTimes(1);
    // tier=null means no profile change is requested; the RPC still records the event id.
    expect(rpcMock).toHaveBeenCalledWith("apply_subscription_event", {
      p_event_id: "wh_route_1",
      p_user_id: null,
      p_tier: null,
      p_modified_at: null,
    });
  });

  it("rejects a missing webhook id before any DB call", async () => {
    const payload = JSON.stringify({ type: "subscription.active", data: { metadata: { user_id: USER_ID } } });
    const request = new Request("https://app.test/api/polar/webhook", {
      method: "POST",
      headers: { "webhook-timestamp": "1", "webhook-signature": "t=1,v1,x" },
      body: payload,
    });

    const response = (await POST(request)) as { status: number };

    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe("polar webhook ordering guard", () => {
  it("extracts the subscription modified timestamp, falling back to current_period_end", () => {
    expect(
      getEventModifiedAt({ type: "subscription.updated", data: { modified_at: "2026-06-29T00:00:00Z" } }),
    ).toBe("2026-06-29T00:00:00Z");

    expect(
      getEventModifiedAt({ type: "subscription.updated", data: { current_period_end: "2026-07-29T00:00:00Z" } }),
    ).toBe("2026-07-29T00:00:00Z");

    expect(getEventModifiedAt({ type: "subscription.updated", data: {} })).toBeNull();
  });

  it("applies an update only when it is not older than the stored timestamp", () => {
    expect(isNewerEvent("2026-06-29T00:00:00Z", null)).toBe(true); // nothing stored yet
    expect(isNewerEvent(null, "2026-06-29T00:00:00Z")).toBe(true); // cannot compare -> allow
    expect(isNewerEvent("2026-06-30T00:00:00Z", "2026-06-29T00:00:00Z")).toBe(true); // newer
    expect(isNewerEvent("2026-06-29T00:00:00Z", "2026-06-29T00:00:00Z")).toBe(true); // tie
    expect(isNewerEvent("2026-06-28T00:00:00Z", "2026-06-29T00:00:00Z")).toBe(false); // stale -> ignore
  });
});

describe("polar webhook signature verification", () => {
  it("accepts a valid webhook signature", () => {
    const payload = JSON.stringify({ type: "subscription.active" });
    const secret = Buffer.from("whsec_test").toString("base64");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const webhookId = "wh_123";
    const signature = signPolarWebhookPayload({ payload, secret, timestamp, webhookId });

    expect(
      verifyPolarSignature({
        payload,
        secret,
        webhookId,
        timestamp,
        header: buildPolarSignatureHeader({ timestamp, webhookId, signatures: [signature] }),
      }),
    ).toBe(true);
  });

  it("rejects missing, malformed, stale, or invalid signatures", () => {
    const payload = "{}";
    const secret = Buffer.from("whsec_test").toString("base64");
    const oldTimestamp = "1000";
    const validTimestamp = Math.floor(Date.now() / 1000).toString();
    const validSignature = signPolarWebhookPayload({ payload, secret, timestamp: validTimestamp });

    expect(verifyPolarSignature({ payload, secret, header: null })).toBe(false);
    expect(verifyPolarSignature({ payload, secret, header: "not-a-signature" })).toBe(false);
    expect(
      verifyPolarSignature({
        payload,
        secret,
        header: buildPolarSignatureHeader({ timestamp: oldTimestamp, signatures: ["bad"] }),
      }),
    ).toBe(false);
    expect(
      verifyPolarSignature({
        payload,
        secret,
        header: buildPolarSignatureHeader({ timestamp: validTimestamp, signatures: [validSignature.slice(2)] }),
      }),
    ).toBe(false);
  });

  it("rejects an otherwise valid signature when the webhook id is missing", () => {
    const payload = "{}";
    const secret = Buffer.from("whsec_test").toString("base64");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signPolarWebhookPayload({ payload, secret, timestamp });

    // No webhook id in header nor params -> Standard Webhooks requires it, so reject.
    expect(
      verifyPolarSignature({
        payload,
        secret,
        header: buildPolarSignatureHeader({ timestamp, signatures: [signature] }),
      }),
    ).toBe(false);
  });

  it("rejects timestamps too far in the future but tolerates small clock skew", () => {
    const payload = "{}";
    const secret = Buffer.from("whsec_test").toString("base64");
    const webhookId = "wh_clock";
    const nowSeconds = Math.floor(Date.now() / 1000);

    const farFuture = (nowSeconds + 3600).toString();
    const farFutureSig = signPolarWebhookPayload({ payload, secret, timestamp: farFuture, webhookId });
    expect(
      verifyPolarSignature({
        payload,
        secret,
        webhookId,
        timestamp: farFuture,
        header: buildPolarSignatureHeader({ timestamp: farFuture, webhookId, signatures: [farFutureSig] }),
      }),
    ).toBe(false);

    const nearFuture = (nowSeconds + 5).toString();
    const nearFutureSig = signPolarWebhookPayload({ payload, secret, timestamp: nearFuture, webhookId });
    expect(
      verifyPolarSignature({
        payload,
        secret,
        webhookId,
        timestamp: nearFuture,
        header: buildPolarSignatureHeader({ timestamp: nearFuture, webhookId, signatures: [nearFutureSig] }),
      }),
    ).toBe(true);
  });
});

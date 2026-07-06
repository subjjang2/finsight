import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks for the webhook route's external boundaries. NextResponse is reduced to a tiny
// shape; the admin Supabase client only needs `rpc`; the GitHub dispatch is stubbed so no
// network call happens. `from` is asserted NEVER called (route never bypasses the RPC).
const { rpcMock, fromMock, dispatchMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  dispatchMock: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

vi.mock("../../../../../lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock, from: fromMock }),
}));

vi.mock("../../../../../services/github", () => ({
  dispatchRepositoryEvent: dispatchMock,
}));

// Imported after the mocks above are registered (vi.mock is hoisted regardless).
import { POST } from "./route";

const SECRET = "oncall-alert-secret";

function buildRequest(body: Record<string, unknown>, token: string = SECRET): Request {
  return new Request("https://app.test/api/posthog/error-alert/webhook", {
    method: "POST",
    headers: { "x-oncall-webhook-token": token, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SINGLE_ALERT = {
  alert_type: "single",
  issue_id: "iss_123",
  issue_url: "https://us.posthog.com/project/498374/error_tracking/iss_123",
  occurred_at: "2026-07-06T00:00:00Z",
};

describe("POST /api/posthog/error-alert/webhook", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
    dispatchMock.mockReset();
    process.env.POSTHOG_ALERT_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.POSTHOG_ALERT_WEBHOOK_SECRET;
  });

  it("returns 500 when the webhook secret is not configured", async () => {
    delete process.env.POSTHOG_ALERT_WEBHOOK_SECRET;

    const response = (await POST(buildRequest(SINGLE_ALERT))) as { status: number };

    expect(response.status).toBe(500);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid token before any DB call or dispatch", async () => {
    const response = (await POST(buildRequest(SINGLE_ALERT, "wrong-token"))) as { status: number };

    expect(response.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a valid token but unparseable / incomplete payload", async () => {
    const badJson = new Request("https://app.test/api/posthog/error-alert/webhook", {
      method: "POST",
      headers: { "x-oncall-webhook-token": SECRET },
      body: "not-json",
    });
    expect(((await POST(badJson)) as { status: number }).status).toBe(400);

    // Parseable JSON but missing the issue id -> parseAlertEvent returns null -> 400.
    const incomplete = (await POST(buildRequest({ alert_type: "single", occurred_at: "2026-07-06T00:00:00Z" }))) as {
      status: number;
    };
    expect(incomplete.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("claims, dispatches to CI, then marks dispatched (happy path)", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: "claimed", error: null }) // claim_alert_event
      .mockResolvedValueOnce({ data: null, error: null }); // mark_alert_dispatched
    dispatchMock.mockResolvedValue(undefined);

    const response = (await POST(buildRequest(SINGLE_ALERT))) as {
      body: { received: boolean };
      status: number;
    };

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
    expect(fromMock).not.toHaveBeenCalled();

    // claim called with the derived event id / fingerprint / alert type.
    expect(rpcMock).toHaveBeenNthCalledWith(1, "claim_alert_event", {
      p_event_id: expect.any(String),
      p_fingerprint: "iss_123",
      p_alert_type: "single",
    });
    // CI dispatch carries the minimal, PII-free pointer set.
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [eventType, clientPayload] = dispatchMock.mock.calls[0];
    expect(eventType).toBe("oncall-prod-alert");
    expect(clientPayload).toMatchObject({
      fingerprint: "iss_123",
      alert_type: "single",
      occurred_at: "2026-07-06T00:00:00Z",
      posthog_issue_id: "iss_123",
      posthog_issue_url: SINGLE_ALERT.issue_url,
    });
    // dispatched marked only after a successful dispatch.
    expect(rpcMock).toHaveBeenNthCalledWith(2, "mark_alert_dispatched", { p_event_id: expect.any(String) });
  });

  it("acknowledges a duplicate delivery without dispatching", async () => {
    rpcMock.mockResolvedValueOnce({ data: "duplicate", error: null });

    const response = (await POST(buildRequest(SINGLE_ALERT))) as {
      body: { received: boolean; duplicate?: boolean };
      status: number;
    };

    expect(response.status).toBe(200);
    expect(response.body.duplicate).toBe(true);
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1); // claim only, no mark
  });

  it("returns 500 and leaves the row pending when CI dispatch fails (no mark, no delete)", async () => {
    rpcMock.mockResolvedValueOnce({ data: "claimed", error: null });
    dispatchMock.mockRejectedValue(new Error("github 503"));

    const response = (await POST(buildRequest(SINGLE_ALERT))) as { status: number };

    expect(response.status).toBe(500);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    // Only the claim ran; the row stays 'pending' (not marked dispatched, not deleted) so a
    // PostHog retry can re-dispatch. No second RPC.
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the claim RPC errors (so PostHog retries)", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });

    const response = (await POST(buildRequest(SINGLE_ALERT))) as { status: number };

    expect(response.status).toBe(500);
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("forwards spike count/threshold in the CI payload", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: "claimed", error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    dispatchMock.mockResolvedValue(undefined);

    await POST(
      buildRequest({
        alert_type: "spike",
        issue_id: "iss_spike",
        occurred_at: "2026-07-06T00:00:00Z",
        count: 200,
        threshold: 20,
      }),
    );

    const [, clientPayload] = dispatchMock.mock.calls[0];
    expect(clientPayload).toMatchObject({
      alert_type: "spike",
      spike_count: 200,
      spike_threshold: 20,
    });
  });
});

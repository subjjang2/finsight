import { describe, expect, it } from "vitest";
import {
  buildPolarSignatureHeader,
  getPolarTierUpdate,
  signPolarWebhookPayload,
  verifyPolarSignature,
} from "../lib/billing/polar";

const USER_ID = "9d48d512-1ec5-45e8-b75d-3e1e93cfe817";

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

  it("maps cancellation and revocation events to a free tier update", () => {
    expect(
      getPolarTierUpdate({
        type: "subscription.canceled",
        data: { customer: { external_id: USER_ID } },
      }),
    ).toEqual({ userId: USER_ID, tier: "free" });

    expect(
      getPolarTierUpdate({
        type: "subscription.revoked",
        data: { external_customer_id: USER_ID },
      }),
    ).toEqual({ userId: USER_ID, tier: "free" });
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
});

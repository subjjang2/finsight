import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseAlertEvent, verifyPosthogAlert } from "./posthog-webhook";

const SECRET = "oncall-shared-secret";

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

function hmacHeaders(rawBody: string, secret: string, timestamp: string): Headers {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return headers({
    "x-oncall-signature": `sha256=${signature}`,
    "x-oncall-timestamp": timestamp,
  });
}

describe("verifyPosthogAlert — shared token (primary)", () => {
  const rawBody = "{}";

  it("accepts a matching shared-secret token header", () => {
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: headers({ "x-oncall-webhook-token": SECRET }) }),
    ).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: headers({ "x-oncall-webhook-token": "nope" }) }),
    ).toBe(false);
  });

  it("rejects a token of different length (no timingSafeEqual throw)", () => {
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: headers({ "x-oncall-webhook-token": "short" }) }),
    ).toBe(false);
  });

  it("rejects when no auth headers are present", () => {
    expect(verifyPosthogAlert({ rawBody, secret: SECRET, headers: headers({}) })).toBe(false);
  });

  it("rejects when the secret is not configured", () => {
    expect(
      verifyPosthogAlert({ rawBody, secret: "", headers: headers({ "x-oncall-webhook-token": "" }) }),
    ).toBe(false);
  });
});

describe("verifyPosthogAlert — HMAC fallback", () => {
  const rawBody = JSON.stringify({ alert_type: "single", issue_id: "iss_1", occurred_at: "2026-07-06T00:00:00Z" });
  const now = new Date("2026-07-06T00:00:30Z");
  const validTs = String(Math.floor(now.getTime() / 1000));

  it("accepts a valid HMAC signature within the replay window", () => {
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: hmacHeaders(rawBody, SECRET, validTs), now }),
    ).toBe(true);
  });

  it("rejects an HMAC signed with the wrong secret", () => {
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: hmacHeaders(rawBody, "other", validTs), now }),
    ).toBe(false);
  });

  it("rejects a tampered body (signature no longer matches)", () => {
    const h = hmacHeaders(rawBody, SECRET, validTs);
    expect(verifyPosthogAlert({ rawBody: rawBody + " ", secret: SECRET, headers: h, now })).toBe(false);
  });

  it("rejects a stale timestamp (replay, older than 5 min)", () => {
    const staleTs = String(Math.floor(now.getTime() / 1000) - 6 * 60);
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: hmacHeaders(rawBody, SECRET, staleTs), now }),
    ).toBe(false);
  });

  it("rejects a timestamp too far in the future", () => {
    const futureTs = String(Math.floor(now.getTime() / 1000) + 5 * 60);
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: hmacHeaders(rawBody, SECRET, futureTs), now }),
    ).toBe(false);
  });

  it("tolerates small clock skew (near future)", () => {
    const nearTs = String(Math.floor(now.getTime() / 1000) + 5);
    expect(
      verifyPosthogAlert({ rawBody, secret: SECRET, headers: hmacHeaders(rawBody, SECRET, nearTs), now }),
    ).toBe(true);
  });
});

describe("parseAlertEvent", () => {
  it("parses a single alert", () => {
    const parsed = parseAlertEvent({
      alert_type: "single",
      issue_id: "iss_abc",
      issue_url: "https://us.posthog.com/project/498374/error_tracking/iss_abc",
      occurred_at: "2026-07-06T00:00:00Z",
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.alertType).toBe("single");
    expect(parsed?.fingerprint).toBe("iss_abc");
    expect(parsed?.posthogIssueId).toBe("iss_abc");
    expect(parsed?.posthogIssueUrl).toBe("https://us.posthog.com/project/498374/error_tracking/iss_abc");
    expect(parsed?.spikeCount).toBeUndefined();
  });

  it("parses a spike alert with count/threshold", () => {
    const parsed = parseAlertEvent({
      alert_type: "spike",
      issue_id: "iss_spike",
      occurred_at: "2026-07-06T00:00:00Z",
      count: 123,
      threshold: 20,
    });

    expect(parsed?.alertType).toBe("spike");
    expect(parsed?.spikeCount).toBe(123);
    expect(parsed?.spikeThreshold).toBe(20);
    expect(parsed?.posthogIssueUrl).toBeNull();
  });

  it("defaults an unknown/missing alert_type to single", () => {
    expect(parseAlertEvent({ issue_id: "i", occurred_at: "2026-07-06T00:00:00Z" })?.alertType).toBe("single");
    expect(
      parseAlertEvent({ alert_type: "weird", issue_id: "i", occurred_at: "2026-07-06T00:00:00Z" })?.alertType,
    ).toBe("single");
  });

  it("returns null without an issue id or occurred_at", () => {
    expect(parseAlertEvent({ alert_type: "single", occurred_at: "2026-07-06T00:00:00Z" })).toBeNull();
    expect(parseAlertEvent({ alert_type: "single", issue_id: "i" })).toBeNull();
    expect(parseAlertEvent(null)).toBeNull();
    expect(parseAlertEvent("not-an-object")).toBeNull();
  });

  it("derives a stable per-delivery event id and error-group fingerprint", () => {
    const body = { alert_type: "single", issue_id: "iss_x", occurred_at: "2026-07-06T00:00:00Z" };
    const a = parseAlertEvent(body);
    const b = parseAlertEvent({ ...body });

    // Deterministic: retries of the same delivery collapse to one event id (idempotency).
    const expected = createHash("sha256").update("single\niss_x\n2026-07-06T00:00:00Z").digest("hex");
    expect(a?.eventId).toBe(expected);
    expect(a?.eventId).toBe(b?.eventId);
    // fingerprint is the error group (stable across firings), distinct from the delivery id.
    expect(a?.fingerprint).toBe("iss_x");
  });

  it("gives distinct event ids to distinct firings of the same error group", () => {
    const first = parseAlertEvent({ alert_type: "spike", issue_id: "iss_y", occurred_at: "2026-07-06T00:00:00Z" });
    const second = parseAlertEvent({ alert_type: "spike", issue_id: "iss_y", occurred_at: "2026-07-06T01:00:00Z" });

    expect(first?.eventId).not.toBe(second?.eventId);
    expect(first?.fingerprint).toBe(second?.fingerprint); // same error group
  });
});

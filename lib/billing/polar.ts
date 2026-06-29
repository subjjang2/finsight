import { createHmac, timingSafeEqual } from "node:crypto";
import type { Tier } from "../../types/tier";

const ACTIVE_EVENTS = new Set(["subscription.active", "subscription.uncanceled"]);
// Demotion happens ONLY on a confirmed loss of access (`subscription.revoked`).
// `subscription.canceled` is intentionally NOT here: Polar emits it when the user
// schedules a cancel-at-period-end, while access (and the paid period) must remain
// until it is actually revoked. Demoting on canceled would strip a still-paid period
// and create Merchant-of-Record refund disputes.
const FREE_EVENTS = new Set(["subscription.revoked"]);
// `subscription.canceled` = scheduled cancellation only -> never changes tier here.
const SCHEDULED_CANCEL_EVENTS = new Set(["subscription.canceled"]);

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
// Confirmed-failure statuses: access is gone -> demote to free.
const FREE_STATUSES = new Set(["canceled", "revoked", "unpaid", "incomplete_expired"]);
// Dunning / pending statuses: payment retry in progress. Policy: KEEP pro during the
// dunning grace period and only demote once the failure is confirmed (`unpaid`/`revoked`).
// These intentionally map to "no tier change" (tierFromEvent returns null).
const DUNNING_STATUSES = new Set(["past_due", "incomplete"]);

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;
// Future timestamps should barely be tolerated (only clock skew). A replayed/forged
// far-future timestamp must be rejected, so the allowance forward is much smaller than
// the backward window.
const FUTURE_TOLERANCE_SECONDS = 60;

export type PolarTierUpdate = {
  userId: string;
  tier: Tier;
};

export type TierMappingOptions = {
  // The Polar product id that grants pro. Defaults to POLAR_PRO_PRODUCT_ID.
  proProductId?: string | null;
};

type PolarLikeEvent = {
  type?: unknown;
  data?: unknown;
};

export function getPolarTierUpdate(
  event: unknown,
  options: TierMappingOptions = {},
): PolarTierUpdate | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const { type, data } = event as PolarLikeEvent;

  if (typeof type !== "string" || !data || typeof data !== "object") {
    return null;
  }

  const proProductId =
    options.proProductId ?? process.env.POLAR_PRO_PRODUCT_ID ?? null;
  const tier = tierFromEvent(type, data as Record<string, unknown>, proProductId);
  const userId = userIdFromPolarData(data as Record<string, unknown>);

  if (!tier || !userId) {
    return null;
  }

  return { userId, tier };
}

// Pulls the subscription's monotonic ordering key from a webhook event so that
// out-of-order / re-delivered events can be ignored. Prefers `modified_at`, then
// `current_period_end`.
export function getEventModifiedAt(event: unknown): string | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const { data } = event as PolarLikeEvent;

  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  return stringValue(record.modified_at) ?? stringValue(record.current_period_end);
}

// Monotonic guard: returns true when an incoming event should be applied over what
// is already stored. Unknown/uncomparable timestamps default to "apply" so a missing
// field never silently drops a legitimate update; only a strictly older timestamp is
// rejected.
export function isNewerEvent(
  incomingModifiedAt: string | null,
  storedModifiedAt: string | null,
): boolean {
  if (!storedModifiedAt || !incomingModifiedAt) {
    return true;
  }

  const incoming = Date.parse(incomingModifiedAt);
  const stored = Date.parse(storedModifiedAt);

  if (!Number.isFinite(incoming) || !Number.isFinite(stored)) {
    return true;
  }

  return incoming >= stored;
}

export function verifyPolarSignature({
  payload,
  secret,
  header,
  webhookId,
  timestamp,
  now = new Date(),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: {
  payload: string;
  secret: string;
  header: string | null;
  webhookId?: string | null;
  timestamp?: string | null;
  now?: Date;
  toleranceSeconds?: number;
}): boolean {
  const parsed = parseSignatureHeader(header);
  const effectiveTimestamp = timestamp ?? parsed.timestamp;
  const effectiveWebhookId = webhookId ?? parsed.webhookId;

  // Standard Webhooks: the webhook id is part of the signed content and must be present.
  // Reject rather than falling back to a id-less signing base.
  if (!effectiveWebhookId || !effectiveTimestamp || parsed.signatures.length === 0) {
    return false;
  }

  const timestampNumber = Number(effectiveTimestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  // Positive delta = the event is in the past, negative = in the future.
  const delta = Math.floor(now.getTime() / 1000) - timestampNumber;

  // Reject events that are too old (replay) or further in the future than clock skew.
  if (delta > toleranceSeconds || delta < -FUTURE_TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${effectiveWebhookId}.${effectiveTimestamp}.${payload}`;
  const expected = createHmac("sha256", normalizeWebhookSecret(secret))
    .update(signedPayload)
    .digest();

  return parsed.signatures.some((signature) => {
    const candidate = signatureToBuffer(signature);

    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export function buildPolarSignatureHeader({
  timestamp,
  webhookId,
  signatures,
}: {
  timestamp: string;
  webhookId?: string;
  signatures: string[];
}): string {
  const signatureParts = signatures.map((signature) => `v1,${signature}`).join(" ");
  const metadata = webhookId ? `id=${webhookId},t=${timestamp}` : `t=${timestamp}`;

  return `${metadata},${signatureParts}`;
}

export function signPolarWebhookPayload({
  payload,
  secret,
  timestamp,
  webhookId,
}: {
  payload: string;
  secret: string;
  timestamp: string;
  webhookId?: string;
}): string {
  const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;

  return createHmac("sha256", normalizeWebhookSecret(secret)).update(signedPayload).digest("base64");
}

function tierFromEvent(
  type: string,
  data: Record<string, unknown>,
  proProductId: string | null,
): Tier | null {
  // Scheduled cancellation: keep current tier (paid period still valid).
  if (SCHEDULED_CANCEL_EVENTS.has(type)) {
    return null;
  }

  // Confirmed loss of access -> demote (no product gating needed for demotion).
  if (FREE_EVENTS.has(type)) {
    return "free";
  }

  if (ACTIVE_EVENTS.has(type)) {
    return grantsPro(data, proProductId) ? "pro" : null;
  }

  if (type === "subscription.created" || type === "subscription.updated") {
    const status = typeof data.status === "string" ? data.status : "";

    if (FREE_STATUSES.has(status)) {
      return "free";
    }

    if (DUNNING_STATUSES.has(status)) {
      // Grace period: leave the tier untouched.
      return null;
    }

    if (ACTIVE_STATUSES.has(status)) {
      return grantsPro(data, proProductId) ? "pro" : null;
    }
  }

  return null;
}

// Only grant pro when the subscription's product matches the configured pro product.
// When `proProductId` is not configured, or the event carries no product id, the check
// cannot be enforced and we fall through (legacy/back-compat); an EXPLICIT mismatch is
// the attack vector ("a different product also granted pro") and is rejected.
function grantsPro(data: Record<string, unknown>, proProductId: string | null): boolean {
  if (!proProductId) {
    return true;
  }

  const eventProductId = extractProductId(data);

  if (!eventProductId) {
    return true;
  }

  return eventProductId === proProductId;
}

function extractProductId(data: Record<string, unknown>): string | null {
  return (
    stringValue(data.product_id) ??
    stringValue(nestedValue(data.price, "product_id")) ??
    stringValue(nestedValue(data.product, "id"))
  );
}

function userIdFromPolarData(data: Record<string, unknown>): string | null {
  return (
    stringValue(metadataValue(data.metadata, "user_id")) ??
    stringValue(metadataValue(data.metadata, "userId")) ??
    stringValue(metadataValue(data.metadata, "supabase_user_id")) ??
    stringValue(data.external_customer_id) ??
    stringValue(data.customer_external_id) ??
    stringValue(nestedValue(data.customer, "external_id")) ??
    stringValue(metadataValue(nestedValue(data.customer, "metadata"), "user_id")) ??
    stringValue(metadataValue(nestedValue(data.customer, "metadata"), "userId")) ??
    stringValue(metadataValue(nestedValue(data.customer, "metadata"), "supabase_user_id"))
  );
}

function metadataValue(metadata: unknown, key: string): unknown {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return (metadata as Record<string, unknown>)[key];
}

function nestedValue(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") {
    return null;
  }

  return (value as Record<string, unknown>)[key];
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function parseSignatureHeader(header: string | null): {
  timestamp: string | null;
  webhookId: string | null;
  signatures: string[];
} {
  if (!header) {
    return { timestamp: null, webhookId: null, signatures: [] };
  }

  const parts = header.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
  let timestamp: string | null = null;
  let webhookId: string | null = null;
  const signatures: string[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (part.startsWith("t=")) {
      timestamp = part.slice(2);
      continue;
    }

    if (part.startsWith("id=")) {
      webhookId = part.slice(3);
      continue;
    }

    if (part === "v1" && parts[index + 1]) {
      signatures.push(parts[index + 1]);
      index += 1;
      continue;
    }

    if (part.startsWith("v1=")) {
      signatures.push(part.slice(3));
    }
  }

  return { timestamp, webhookId, signatures };
}

function normalizeWebhookSecret(secret: string): Buffer {
  const stripped = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const decoded = Buffer.from(stripped, "base64");
  const normalizedInput = stripped.replace(/=+$/, "");
  const normalizedDecoded = decoded.toString("base64").replace(/=+$/, "");

  return decoded.length > 0 && normalizedInput === normalizedDecoded ? decoded : Buffer.from(stripped);
}

function signatureToBuffer(signature: string): Buffer {
  if (/^[a-f0-9]{64}$/i.test(signature)) {
    return Buffer.from(signature, "hex");
  }

  return Buffer.from(signature, "base64");
}

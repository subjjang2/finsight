import { createHmac, timingSafeEqual } from "node:crypto";
import type { Tier } from "../../types/tier";

const ACTIVE_EVENTS = new Set(["subscription.active", "subscription.uncanceled"]);
const FREE_EVENTS = new Set(["subscription.canceled", "subscription.revoked"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const FREE_STATUSES = new Set(["canceled", "revoked", "unpaid", "incomplete_expired"]);
const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export type PolarTierUpdate = {
  userId: string;
  tier: Tier;
};

type PolarLikeEvent = {
  type?: unknown;
  data?: unknown;
};

export function getPolarTierUpdate(event: unknown): PolarTierUpdate | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const { type, data } = event as PolarLikeEvent;

  if (typeof type !== "string" || !data || typeof data !== "object") {
    return null;
  }

  const tier = tierFromEvent(type, data as Record<string, unknown>);
  const userId = userIdFromPolarData(data as Record<string, unknown>);

  if (!tier || !userId) {
    return null;
  }

  return { userId, tier };
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

  if (!effectiveTimestamp || parsed.signatures.length === 0) {
    return false;
  }

  const timestampNumber = Number(effectiveTimestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const age = Math.abs(Math.floor(now.getTime() / 1000) - timestampNumber);

  if (age > toleranceSeconds) {
    return false;
  }

  const signedPayload = effectiveWebhookId
    ? `${effectiveWebhookId}.${effectiveTimestamp}.${payload}`
    : `${effectiveTimestamp}.${payload}`;
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

function tierFromEvent(type: string, data: Record<string, unknown>): Tier | null {
  if (ACTIVE_EVENTS.has(type)) {
    return "pro";
  }

  if (FREE_EVENTS.has(type)) {
    return "free";
  }

  if (type === "subscription.created" || type === "subscription.updated") {
    const status = typeof data.status === "string" ? data.status : "";

    if (ACTIVE_STATUSES.has(status)) {
      return "pro";
    }

    if (FREE_STATUSES.has(status)) {
      return "free";
    }
  }

  return null;
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

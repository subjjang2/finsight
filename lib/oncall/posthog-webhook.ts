import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// oncall PROD ALERT 1차 방어선 — PostHog 에러 알림의 검증 + 정규화.
//
// PostHog custom webhook(HogFunction/Destination)은 표준 서명을 보장하지 않으므로 body/헤더를
// 우리가 정의한다. lib/billing/polar.ts 의 HMAC + timingSafeEqual + replay 윈도우 패턴을 재사용하되,
// Standard-Webhooks 봉투는 불필요하므로 (1) 공유 시크릿 토큰 헤더(primary) + (2) 선택적 HMAC 폴백으로
// 단순화한다. 둘 중 하나라도 통과하면 유효.

const REPLAY_TOLERANCE_PAST_SECONDS = 5 * 60;
// polar 와 동일: 미래 타임스탬프는 시계 오차만 허용(위조된 far-future 재생 차단).
const REPLAY_TOLERANCE_FUTURE_SECONDS = 60;

export type AlertType = "single" | "spike";

export type ParsedAlert = {
  eventId: string; // 배송별 멱등키 (DB claim)
  fingerprint: string; // 에러그룹별 키 (escalation dedup)
  alertType: AlertType;
  occurredAt: string;
  posthogIssueId: string;
  posthogIssueUrl: string | null;
  spikeCount?: number;
  spikeThreshold?: number;
};

export function verifyPosthogAlert({
  rawBody,
  headers,
  secret,
  now = new Date(),
}: {
  rawBody: string;
  headers: Headers;
  secret: string;
  now?: Date;
}): boolean {
  if (!secret) {
    return false;
  }

  // Primary: 공유 시크릿 토큰 헤더(상수시간 비교).
  const token = headers.get("x-oncall-webhook-token");
  if (token && safeEqual(token, secret)) {
    return true;
  }

  // 선택적 HMAC 폴백: raw body 를 서명하고 타임스탬프에 replay 윈도우를 건다.
  const signatureHeader = headers.get("x-oncall-signature");
  const timestamp = headers.get("x-oncall-timestamp");
  if (signatureHeader && timestamp) {
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) {
      return false;
    }

    // Positive delta = 과거, negative = 미래.
    const delta = Math.floor(now.getTime() / 1000) - timestampNumber;
    if (delta > REPLAY_TOLERANCE_PAST_SECONDS || delta < -REPLAY_TOLERANCE_FUTURE_SECONDS) {
      return false;
    }

    const provided = signatureHeader.startsWith("sha256=")
      ? signatureHeader.slice("sha256=".length)
      : signatureHeader;
    // 타임스탬프를 서명 대상에 포함해 replay 시 타임스탬프 위조를 묶는다.
    const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

    if (safeEqual(provided, expected)) {
      return true;
    }
  }

  return false;
}

// 알림 payload 를 CI 로 넘길 최소 정규형으로 파싱한다. raw 스택트레이스/PII 는 담지 않는다.
// eventId  = sha256(alert_type + issue_id + occurred_at) → 같은 배송의 재전송은 동일(멱등),
//            다른 firing 은 다른 값(재판정 허용).
// fingerprint = issue_id → 에러그룹 안정키(escalation dedup).
export function parseAlertEvent(payload: unknown): ParsedAlert | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  const rawType = stringValue(record.alert_type);
  const alertType: AlertType = rawType === "spike" ? "spike" : "single";

  const posthogIssueId = stringValue(record.issue_id) ?? stringValue(record.fingerprint);
  const occurredAt = stringValue(record.occurred_at) ?? stringValue(record.timestamp);

  if (!posthogIssueId || !occurredAt) {
    return null;
  }

  const eventId = createHash("sha256")
    .update(`${alertType}\n${posthogIssueId}\n${occurredAt}`)
    .digest("hex");

  const parsed: ParsedAlert = {
    eventId,
    fingerprint: posthogIssueId,
    alertType,
    occurredAt,
    posthogIssueId,
    posthogIssueUrl: stringValue(record.issue_url),
  };

  if (alertType === "spike") {
    const count = numberValue(record.count);
    const threshold = numberValue(record.threshold);
    if (count !== undefined) parsed.spikeCount = count;
    if (threshold !== undefined) parsed.spikeThreshold = threshold;
  }

  return parsed;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual 은 길이가 다르면 throw → 길이 불일치는 먼저 false 로 거른다(polar 패턴).
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

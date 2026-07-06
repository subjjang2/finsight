import { NextResponse } from "next/server";
import { parseAlertEvent, verifyPosthogAlert } from "../../../../../lib/oncall/posthog-webhook";
import { createAdminClient } from "../../../../../lib/supabase/admin";
import { dispatchRepositoryEvent } from "../../../../../services/github";
import { captureServerException } from "../../../../../lib/analytics/server";

// oncall PROD ALERT 1차 방어선 — 서버리스 인입 핸들러.
//
// 판정하지 않는다. 오직 (1) 서명/시크릿 검증 (2) 멱등 claim(event_id 선삽입)
// (3) CI 위임(repository_dispatch) 까지만 한다. 노이즈/신호 판정과 escalation 은
// 헤드리스 에이전트 CI(oncall-prod-alert.yml)가 하며, 그쪽은 prod read-only 다.
const DISPATCH_EVENT_TYPE = "oncall-prod-alert";

export async function POST(request: Request) {
  const secret = process.env.POSTHOG_ALERT_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "PostHog alert webhook secret is not configured." }, { status: 500 });
  }

  // Standard Webhooks 처럼 서명 검증에 raw body 가 필요하므로 JSON.parse 전에 text 로 읽는다.
  const rawBody = await request.text();

  if (!verifyPosthogAlert({ rawBody, headers: request.headers, secret })) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const alert = parseAlertEvent(payload);
  if (!alert) {
    return NextResponse.json({ error: "Unrecognized alert payload." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 멱등 계층 (a): event_id 선삽입(pending). 'duplicate' = 이미 dispatched 된 배송의 재전송.
  const { data: claim, error: claimError } = await supabase.rpc("claim_alert_event", {
    p_event_id: alert.eventId,
    p_fingerprint: alert.fingerprint,
    p_alert_type: alert.alertType,
  });

  if (claimError) {
    await captureServerException(claimError, {
      source: "posthog.alert.claim",
      properties: { eventId: alert.eventId, fingerprint: alert.fingerprint },
    });
    // 5xx → PostHog 재시도. 아직 dispatch 전이므로 claim 은 pending 이거나 미기록.
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  if (claim === "duplicate") {
    // 이미 CI 로 위임된 배송. 재dispatch 없이 200 ack(재시도 중단).
    return NextResponse.json({ received: true, duplicate: true });
  }

  // CI 로 넘기는 최소·무 PII 포인터. raw 스택트레이스/PII 는 넘기지 않는다(CI 가 read-only 로 재수집).
  const clientPayload: Record<string, unknown> = {
    event_id: alert.eventId,
    fingerprint: alert.fingerprint,
    alert_type: alert.alertType,
    occurred_at: alert.occurredAt,
    posthog_issue_id: alert.posthogIssueId,
    posthog_issue_url: alert.posthogIssueUrl,
  };
  if (alert.alertType === "spike") {
    if (alert.spikeCount !== undefined) clientPayload.spike_count = alert.spikeCount;
    if (alert.spikeThreshold !== undefined) clientPayload.spike_threshold = alert.spikeThreshold;
  }
  // 에러 요약(비 PII, 절단됨)이 있으면 CI triage 가 '무슨 에러'를 실제로 짚도록 함께 넘긴다.
  if (alert.errorName) clientPayload.error_name = alert.errorName;
  if (alert.errorMessage) clientPayload.error_message = alert.errorMessage;
  if (alert.errorFrames) clientPayload.error_frames = alert.errorFrames;

  try {
    await dispatchRepositoryEvent(DISPATCH_EVENT_TYPE, clientPayload);
  } catch (error) {
    await captureServerException(error, {
      source: "posthog.alert.dispatch",
      properties: { eventId: alert.eventId, fingerprint: alert.fingerprint },
    });
    // dispatch 실패: claim row 는 pending 으로 남긴다(삭제 안 함). 500 → PostHog 재시도가
    // pending 을 보고 재dispatch 를 허용한다(poison-message 회피). 재시도가 이중 dispatch 를
    // 만들어도 CI 쪽 fingerprint 이슈 dedup 이 흡수하므로 중복 이슈는 열리지 않는다.
    return NextResponse.json({ error: "Failed to dispatch alert to CI." }, { status: 500 });
  }

  // dispatch 성공 후에만 dispatched 로 마킹(재전송이 다시 CI 를 깨우지 않게).
  await supabase.rpc("mark_alert_dispatched", { p_event_id: alert.eventId });

  return NextResponse.json({ received: true });
}

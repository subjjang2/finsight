-- oncall PROD ALERT 1차 방어선: PostHog 에러 알림의 인입 멱등 + CI 위임 추적.
--
-- 서버리스 웹훅(app/api/posthog/error-alert/webhook)은 판정하지 않는다. 서명/시크릿을
-- 검증하고, event_id 를 여기 선삽입(claim)해 "이 배송을 CI 로 딱 한 번만 위임"함을
-- 보장한 뒤, GitHub repository_dispatch 로 판정을 넘긴다. 판정(노이즈/신호)과
-- escalation(GitHub 이슈)은 헤드리스 에이전트 CI 가 하고, 그쪽은 prod read-only 라
-- 이 테이블에 쓰지 않는다(escalation dedup 은 GitHub 이슈가 단일 소스).
--
-- 멱등 계층 (a) — 인입 dedup:
--   claim_alert_event: event_id 를 status='pending' 으로 선삽입(0003 apply_subscription_event
--   와 동일한 insert-on-conflict + if-not-found 패턴). 선삽입 후 dispatch 가 실패하면
--   라우트는 이 row 를 지우지 않고 500 만 반환한다 → PostHog 재시도가 오면 pending 을 보고
--   재dispatch 를 '허용'한다(poison-message 회피). 이미 dispatched 된 배송의 재전송만
--   'duplicate' 로 막는다. 이중 dispatch 위험은 계층 (b) fingerprint 이슈 dedup 이 흡수한다.
--
-- 모든 write 는 service-role 웹훅으로만 일어난다(RLS 우회). authenticated/anon 접근 없음.

create table if not exists public.alert_events (
  id text primary key,                                -- event_id (배송별 멱등키)
  fingerprint text not null,                          -- 에러그룹별 키 (escalation dedup용, CI로 전달)
  alert_type text not null,                           -- 'single' | 'spike'
  dispatch_status text not null default 'pending',    -- 'pending' | 'dispatched'
  received_at timestamptz not null default now(),
  dispatched_at timestamptz
);

alter table public.alert_events enable row level security;
-- No policies: service-role bypasses RLS; authenticated/anon get no access.

comment on table public.alert_events is
  'PostHog 에러 알림 인입 멱등 + CI위임 추적. service-role 웹훅만 write. '
  'dispatch_status=pending 인 채 실패한 배송은 재시도로 재dispatch 허용, dispatched 는 중복 차단.';

-- 인입 claim: event_id 를 pending 으로 선삽입한다.
--   - 최초 인입(insert 성공)                → 'claimed'
--   - 재전송인데 이미 dispatched            → 'duplicate' (라우트가 재dispatch 안 함, 200 ack)
--   - 재전송인데 아직 pending(이전 시도 실패) → 'claimed' (재dispatch 허용)
-- 되돌리기 어려운 상태변이가 아니라 'CI 위임 1회 보장용 claim' 이므로 라우트 선삽입이 안전하다.
create or replace function public.claim_alert_event(
  p_event_id text,
  p_fingerprint text,
  p_alert_type text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  insert into public.alert_events (id, fingerprint, alert_type)
  values (p_event_id, p_fingerprint, p_alert_type)
  on conflict (id) do nothing;

  if found then
    -- 최초 인입: pending 으로 claim.
    return 'claimed';
  end if;

  -- 충돌: 기존 row 의 dispatch 상태로 재시도 허용 여부를 가른다.
  select dispatch_status into v_status
  from public.alert_events
  where id = p_event_id;

  if v_status = 'dispatched' then
    return 'duplicate';   -- 이미 CI 로 넘어간 배송 → 재dispatch 금지.
  end if;

  return 'claimed';       -- 이전 시도가 dispatch 전 죽음(pending) → 재dispatch 허용.
end;
$$;

-- dispatch 성공 후 호출: 재전송이 다시 CI 를 깨우지 않도록 dispatched 로 마킹.
create or replace function public.mark_alert_dispatched(
  p_event_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.alert_events
    set dispatch_status = 'dispatched',
        dispatched_at = now()
  where id = p_event_id;
end;
$$;

-- Service-role only. Never exposed to API roles.
revoke execute on function public.claim_alert_event(text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_alert_event(text, text, text)
  to service_role;

revoke execute on function public.mark_alert_dispatched(text)
  from public, anon, authenticated;
grant execute on function public.mark_alert_dispatched(text)
  to service_role;

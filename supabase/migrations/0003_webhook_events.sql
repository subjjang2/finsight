-- Polar webhook hardening: idempotency + monotonic ordering guard, applied atomically.
--
-- 1) webhook_events: dedupe table keyed by the Standard Webhooks webhook-id.
-- 2) profiles.sub_modified_at: stores the subscription `modified_at` (or
--    `current_period_end`) of the last applied event so that an out-of-order /
--    re-delivered older event cannot resurrect a stale tier (e.g. revive a canceled
--    user back to pro).
-- 3) apply_subscription_event(): SECURITY DEFINER function that records the id, runs the
--    ordering guard, and updates the tier in a SINGLE transaction. The route calls only
--    this, so a transient failure rolls back the id insert too (no poison message).
--
-- All writes happen via the Polar webhook using the service-role client (RLS bypassed).
-- No authenticated-user access is granted to webhook_events or the function.

create table if not exists public.webhook_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

alter table public.webhook_events enable row level security;
-- No policies: service-role bypasses RLS; authenticated/anon get no access.

comment on table public.webhook_events is
  'Processed Polar webhook ids for idempotency. Written by service-role webhook only.';

alter table public.profiles
  add column if not exists sub_modified_at timestamptz;

comment on column public.profiles.sub_modified_at is
  'Monotonic ordering key (subscription modified_at/current_period_end) of the last '
  'applied Polar event. Used to ignore out-of-order/replayed webhook deliveries.';

-- Atomic webhook application: idempotency record + ordering guard + tier change in ONE
-- transaction. The route calls only this. If any step raises, the whole function rolls
-- back (including the webhook_events insert), so a Polar retry reprocesses cleanly and a
-- transient DB failure can never permanently skip a paid tier change (poison message).
--
-- Returns true when the event is newly processed, false when it was a duplicate (the
-- route then acknowledges with 200 without retrying).
--
-- Called by the webhook using the service-role client, so there is no auth.uid(); the
-- user id is passed in. p_tier null = "no tier change" (e.g. scheduled cancel): the
-- event is still recorded, but profiles is left untouched.
create or replace function public.apply_subscription_event(
  p_event_id text,
  p_user_id uuid,
  p_tier text,
  p_modified_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.webhook_events (id)
  values (p_event_id)
  on conflict (id) do nothing;

  if not found then
    -- Duplicate delivery: already processed, do nothing else.
    return false;
  end if;

  if p_tier is not null then
    -- Monotonic ordering guard lives in the WHERE clause: skip the update when the
    -- incoming event is older than the last applied one (out-of-order / replay).
    update public.profiles
      set tier = p_tier,
          sub_modified_at = coalesce(p_modified_at, sub_modified_at)
    where id = p_user_id
      and (
        sub_modified_at is null
        or p_modified_at is null
        or sub_modified_at <= p_modified_at
      );
  end if;

  return true;
end;
$$;

-- Service-role only. Never exposed to API roles.
revoke execute on function public.apply_subscription_event(text, uuid, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_subscription_event(text, uuid, text, timestamptz)
  to service_role;

-- Atomic metering to close the TOCTOU gap between the limit check and the
-- count increment in app/api/analyses/route.ts. Without this, concurrent
-- requests could both pass the check and each trigger a paid Claude call.
--
-- consume_analysis_credit locks the caller's profile row, resets the count when
-- the calendar month changed (same rule as lib/entitlements.ts currentPeriod),
-- and increments only when the effective count is below the tier limit — all in
-- one transaction. Returns whether the credit was granted, the new count and the
-- caller's tier so the route can pick the correct rejection status (free=402,
-- pro=403).

create or replace function public.consume_analysis_credit(
  p_period text,
  p_free_limit integer,
  p_pro_limit integer
)
returns table (allowed boolean, new_count integer, tier text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_effective integer;
  v_limit integer;
  v_count integer;
  v_period text;
begin
  select p.tier, p.monthly_analysis_count, p.count_period
    into v_tier, v_count, v_period
  from public.profiles p
  where p.id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found for current user.';
  end if;

  v_tier := case when v_tier = 'pro' then 'pro' else 'free' end;
  v_limit := case when v_tier = 'pro' then p_pro_limit else p_free_limit end;
  v_effective := case when v_period is distinct from p_period then 0 else coalesce(v_count, 0) end;

  if v_effective >= v_limit then
    return query select false, v_effective, v_tier;
    return;
  end if;

  update public.profiles
    set monthly_analysis_count = v_effective + 1,
        count_period = p_period
  where id = auth.uid();

  return query select true, v_effective + 1, v_tier;
end;
$$;

-- Compensating decrement used by the route when analysis fails AFTER a credit was
-- consumed (e.g. Claude classification error), so a failed run does not burn the
-- user's monthly quota. Never drops below zero and only adjusts the active period.
create or replace function public.refund_analysis_credit(p_period text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  update public.profiles
    set monthly_analysis_count = greatest(coalesce(monthly_analysis_count, 0) - 1, 0)
  where id = auth.uid()
    and count_period = p_period
  returning monthly_analysis_count into v_new;

  return coalesce(v_new, 0);
end;
$$;

revoke all on function public.consume_analysis_credit(text, integer, integer) from public, anon;
revoke all on function public.refund_analysis_credit(text) from public, anon;
grant execute on function public.consume_analysis_credit(text, integer, integer) to authenticated;
grant execute on function public.refund_analysis_credit(text) to authenticated;

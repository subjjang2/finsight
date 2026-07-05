-- Supabase advisor remediation (security + performance).
--
-- Sourced from `get_advisors` (security + performance) run against the production
-- project. Each block below cites the lint it resolves. Items deliberately NOT
-- changed because they are by-design / false positives:
--   * webhook_events "RLS enabled, no policy" (0008)  -> intentional: service-role
--     only table, authenticated/anon must have zero access (see 0003).
--   * consume/refund_analysis_credit executable by `authenticated` (0029) -> required:
--     the route calls them with the user session client and each only mutates the
--     caller's own profile row via auth.uid().
--   * unused indexes uploads_user_id_created_at_idx / transactions_user_id_upload_id_idx
--     (0005) -> project is days old with no traffic; "unused" == not yet exercised,
--     not redundant. Revisit after real usage accrues.
-- Also note: "Leaked Password Protection Disabled" is an Auth dashboard setting and
-- cannot be fixed from SQL — enable it in Dashboard > Authentication > Policies.


-- S1) 0011 function_search_path_mutable: pin the trigger function's search_path so it
-- cannot be hijacked. It references only auth.role() (already schema-qualified) and
-- NEW/OLD, so an empty search_path is safe.
create or replace function public.prevent_profile_tier_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.role() = 'authenticated' and new.tier is distinct from old.tier then
    raise exception 'profiles.tier is managed by Polar webhook only';
  end if;

  return new;
end;
$$;


-- S2) 0028/0029 anon+authenticated can execute SECURITY DEFINER handle_new_user via
-- /rest/v1/rpc/. It is an auth.users INSERT trigger only; triggers fire as the table
-- owner regardless of EXECUTE grants, so revoking the API roles removes the RPC
-- surface without breaking signup.
revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- P1) 0001 unindexed_foreign_keys: the existing composite indexes lead with user_id,
-- so a lookup/cascade by upload_id alone (e.g. deleting an upload) is uncovered. Add
-- covering indexes on the FK columns.
create index if not exists transactions_upload_id_idx on public.transactions (upload_id);
create index if not exists insights_upload_id_idx on public.insights (upload_id);


-- P2) 0003 auth_rls_initplan: wrap auth.uid() in a scalar subselect so Postgres
-- evaluates it once per statement instead of once per row. Recreates all 14 flagged
-- policies with identical semantics.

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- uploads
drop policy if exists "uploads_select_own" on public.uploads;
create policy "uploads_select_own"
  on public.uploads
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "uploads_insert_own" on public.uploads;
create policy "uploads_insert_own"
  on public.uploads
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "uploads_update_own" on public.uploads;
create policy "uploads_update_own"
  on public.uploads
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "uploads_delete_own" on public.uploads;
create policy "uploads_delete_own"
  on public.uploads
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- transactions
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = transactions.upload_id
        and uploads.user_id = (select auth.uid())
    )
  );

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = transactions.upload_id
        and uploads.user_id = (select auth.uid())
    )
  );

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- insights
drop policy if exists "insights_select_own" on public.insights;
create policy "insights_select_own"
  on public.insights
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insights_insert_own" on public.insights;
create policy "insights_insert_own"
  on public.insights
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = insights.upload_id
        and uploads.user_id = (select auth.uid())
    )
  );

drop policy if exists "insights_update_own" on public.insights;
create policy "insights_update_own"
  on public.insights
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.uploads
      where uploads.id = insights.upload_id
        and uploads.user_id = (select auth.uid())
    )
  );

drop policy if exists "insights_delete_own" on public.insights;
create policy "insights_delete_own"
  on public.insights
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

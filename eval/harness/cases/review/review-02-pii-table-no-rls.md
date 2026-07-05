---
track: review
id: review-02-pii-table-no-rls
expect: violation
rule: A3
title: migration creates a financial-PII table without enabling RLS
---
-- supabase/migrations/0006_card_details.sql
create table public.card_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_number text,
  merchant text,
  amount numeric(14, 2)
);
-- (no `alter table ... enable row level security`, no policies)

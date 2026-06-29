# Step 1: budget-schema

`budgets` 테이블 마이그레이션을 작성한다. **SQL 파일 작성까지가 이 step의 범위**다(실제 DB 반영은 별도).

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md`, `/docs/ADR.md`
- `supabase/migrations/0001_init.sql` — 테이블·RLS 정책·인덱스 패턴의 정본. **이 스타일을 그대로 따른다.**
- `types/budget.ts` (step 0 산출물) — 컬럼이 타입과 일치하는지 확인.

## 작업

`supabase/migrations/0004_budgets.sql`를 새로 만든다.

테이블:
- `id uuid pk default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `category text not null check (category in (...12개...))` — `0001_init.sql`의 transactions.category check 목록과 **동일하게** 박는다.
- `period text not null` — 'YYYY-MM'
- `limit_amount numeric(14,2) not null check (limit_amount >= 0)`
- `created_at`, `updated_at timestamptz not null default now()`
- `unique (user_id, category, period)` — 한 카테고리·기간당 예산 1개.

RLS (**필수**):
- `alter table public.budgets enable row level security;`
- select/insert/update/delete 각각 `to authenticated using/with check (auth.uid() = user_id)`.
  transactions처럼 upload 종속이 없으므로 정책은 `auth.uid() = user_id`만으로 충분하다.

인덱스: `budgets_user_period_idx on public.budgets(user_id, period)`.

## Acceptance Criteria

```bash
npm run build   # 변경 없음 확인(빌드 깨지지 않음)
npm test
```

## 검증 절차

1. 위 AC 실행.
2. 체크리스트: **RLS가 enable + 4개 정책 모두 존재하는가?**(PII 테이블 RLS 강제 — CLAUDE.md CRITICAL) category check 목록이 enum 12개와 일치하는가? unique 제약이 있는가?
3. 갱신:
   - SQL 작성 완료 + 자동 적용 불가 → step 1을 `blocked`, `blocked_reason: "0004_budgets.sql 작성 완료. Supabase 수동 적용 필요(supabase db push 또는 대시보드)."` 후 중단.
   - (자동 적용 환경이면) `completed` + `summary`.

## 금지사항

- RLS 없이 테이블을 만들지 마라. 이유: 금융 PII 테이블은 소유자만 접근(CLAUDE.md CRITICAL).
- category를 자유 텍스트로 두지 마라. 이유: 고정 enum 강제. check 제약 필수.
- 마이그레이션을 실제 운영 DB에 임의로 적용하지 마라. 이유: 사용자 확인 대상.

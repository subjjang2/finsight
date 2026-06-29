# Step 2: db-schema

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (데이터 모델 절: profiles/uploads/transactions/insights, 데이터 흐름)
- `/docs/ADR.md` (ADR-002 RLS 2중 방어, ADR-003 service-role 웹훅 전용, ADR-004 tier는 웹훅만 변경)
- `/AGENTS.md` (CRITICAL: PII 테이블 RLS 강제)
- step 1 산출물: `types/category.ts`, `types/tier.ts`, `types/transaction.ts` (컬럼·enum 정합 확인)

## 작업

`supabase/migrations/0001_init.sql` 하나로 전체 스키마 + RLS + Storage 정책을 정의한다. (이 step은 SQL 작성만; 실제 Supabase 적용은 하지 않는다.)

**테이블** (모두 `auth.users` 연동, `user_id uuid` 소유자 컬럼):

1. `profiles` — `id uuid PK references auth.users(id)`, `email text`, `tier text not null default 'free' check (tier in ('free','pro'))`, `monthly_analysis_count int not null default 0`, `count_period text`(예: `'2026-06'` 캘린더 월 키), `created_at timestamptz default now()`.
2. `uploads` — `id uuid PK default gen_random_uuid()`, `user_id uuid not null references auth.users(id)`, `file_name text`, `row_count int`, `column_mapping jsonb`, `storage_path text`, `created_at timestamptz default now()`.
3. `transactions` — `id uuid PK`, `user_id uuid not null`, `upload_id uuid references uploads(id) on delete cascade`, `tx_date date`, `merchant text`, `amount numeric(14,2)`, `category text not null check (category in (...12개 enum...))`.
4. `insights` — `id uuid PK`, `user_id uuid not null`, `upload_id uuid references uploads(id) on delete cascade`, `total numeric(14,2)`, `tx_count int`, `breakdown jsonb`, `summary text`, `created_at timestamptz default now()`.

**RLS (CRITICAL)**:
- 4개 테이블 모두 `enable row level security`.
- `profiles`: 본인 row만 select/update (`auth.uid() = id`).
- `uploads`/`transactions`/`insights`: `auth.uid() = user_id`로 **select/insert/update/delete 정책을 빠짐없이** 작성한다(ADR-003: INSERT 정책 누락 금지).
- `profiles.tier`는 일반 사용자 update에서 변경 불가하도록 한다(tier는 service-role 웹훅만 갱신 — ADR-004). update 정책의 `with check`로 tier 변경을 차단하거나, tier를 별도로 두고 트리거/주석으로 웹훅 전용임을 명시.

**신규 가입 트리거**: `auth.users` insert 시 `profiles` row 자동 생성(`handle_new_user` 함수 + trigger).

**Storage**: `card-statements` 비공개 버킷 생성 SQL + Storage RLS 정책(경로 `{user_id}/...` 기준 본인만 read/insert). service-role은 정책 우회로 웹훅/서버 작업 가능.

`category check` 제약의 12개 값은 step 1 `types/category.ts`와 **정확히 일치**시킨다.

## Acceptance Criteria

```bash
npm run build   # 앱 빌드(이 step은 코드 변경 없음 → 회귀 없음 확인)
```
- `supabase/migrations/0001_init.sql`이 존재하고 위 4테이블·RLS·Storage 정책을 모두 포함한다.
- (선택) `psql`/`supabase db lint`가 가능한 환경이면 구문 검증. 불가하면 SQL을 육안 검토한다.

## 검증 절차

1. AC 실행 및 SQL 육안 검토.
2. 아키텍처 체크리스트:
   - PII 테이블(transactions 등) **모두 RLS enable + insert/select/update/delete 정책 존재** (AGENTS.md CRITICAL, ADR-003)
   - `profiles.tier` 일반 update로 변경 불가 (ADR-004)
   - `category` check 값이 12개 enum과 일치 (ADR-008)
   - Storage 버킷 비공개 + 경로 기반 RLS
3. 결과에 따라 `phases/0-mvp/index.json`의 step 2를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "0001_init.sql 테이블·RLS·Storage 정책 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요(예: Supabase 프로젝트 미생성으로 적용 불가) → `"status": "blocked"`, `"blocked_reason"` 후 중단. **단, SQL 파일 작성 자체는 적용 없이 완료 가능하므로 가급적 completed 목표.**

## 금지사항

- RLS 없는 PII 테이블을 만들지 마라. 이유: AGENTS.md CRITICAL, IDOR 차단(ADR-002).
- INSERT/UPDATE RLS 정책을 생략하지 마라. 이유: select만 막으면 위조 삽입 가능(ADR-003).
- 일반 사용자가 `profiles.tier`를 바꿀 수 있게 두지 마라. 이유: tier 단일 진실원은 Polar 웹훅(ADR-004).
- 카테고리 check에 12개 외 값을 넣지 마라. 이유: enum 일관성(ADR-008).

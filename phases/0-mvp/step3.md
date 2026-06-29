# Step 3: supabase-clients

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (외부 클라이언트는 함수 내부 lazy 생성, 미터링 규칙)
- `/docs/ADR.md` (ADR-002·003 user-scoped vs service-role, ADR-005 게이팅)
- `/AGENTS.md` (CRITICAL: service-role·비밀키 서버 전용, NEXT_PUBLIC_*만 클라)
- step 1 산출물: `types/tier.ts`(FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT)
- step 2 산출물: `supabase/migrations/0001_init.sql`(profiles 컬럼: tier, monthly_analysis_count, count_period)

## 작업

Supabase 클라이언트 래퍼와 미터링(entitlement) 로직을 만든다.

1. **`lib/supabase/server.ts`** — `@supabase/ssr`로 **user-scoped** SSR 클라이언트 생성 함수 `createServerClient()`. 쿠키 기반 세션. `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용. RLS 적용 경로.
2. **`lib/supabase/admin.ts`** — **service-role** 클라이언트 `createAdminClient()`. `SUPABASE_SERVICE_ROLE_KEY` 사용. 파일 상단에 `import 'server-only'`로 클라 번들 유입을 차단한다. **웹훅·서버 전용**임을 주석으로 명시.
3. **`lib/entitlements.ts`** — 미터링 순수 로직 + 조회 함수 분리:
   - `currentPeriod(date: Date): string` — `'YYYY-MM'` 캘린더 월 키(순수 함수).
   - `canAnalyze(tier: Tier, count: number): boolean` — Free는 `count < FREE_MONTHLY_LIMIT`, Pro는 `count < PRO_FAIR_USE_LIMIT`.
   - `nextCount(profile, now)` 류의 헬퍼 — period가 바뀌었으면 count를 0으로 리셋 후 +1, 같으면 +1 (캘린더 월 리셋).
   - 동시성 원자화는 MVP 제외(PRD) — 단순 조회·증가로 충분.

외부 클라이언트는 **반드시 함수 내부에서 lazy 생성**한다(top-level 인스턴스 금지 — ARCHITECTURE 패턴).

**TDD**: `lib/entitlements.ts`의 순수 함수(`currentPeriod`, `canAnalyze`, count 리셋 로직)는 테스트를 먼저 작성하라. Supabase 클라이언트 생성 자체는 테스트 불필요(모킹 과함).

## Acceptance Criteria

```bash
npm run build   # 타입 에러 없음
npm test        # entitlements 순수 로직 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `admin.ts`에 `import 'server-only'` 존재, service-role 키가 클라 번들에 노출 안 됨 (AGENTS.md CRITICAL, ADR-003)
   - 클라이언트는 함수 내부 lazy 생성 (ARCHITECTURE 패턴)
   - Free 5건 / Pro 200건 경계가 `types/tier.ts` 상수와 일치
   - 캘린더 월 리셋 로직이 매월 카운트를 리셋
3. 결과에 따라 `phases/0-mvp/index.json`의 step 3을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "supabase server/admin 클라 + entitlements 게이팅 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- service-role 클라이언트를 클라이언트 컴포넌트에서 import 가능하게 만들지 마라. 이유: RLS 우회 키 노출(AGENTS.md CRITICAL).
- top-level에서 Supabase 클라이언트를 인스턴스화하지 마라. 이유: 빌드/엣지에서 환경변수 미존재 시 크래시(ARCHITECTURE).
- 동시성 락·트랜잭션 원자화를 구현하지 마라. 이유: MVP 제외 사항(PRD), 단순 카운트로 충분.
- 기존 테스트를 깨뜨리지 마라.

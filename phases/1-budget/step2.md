# Step 2: budget-api

`budgets` CRUD를 처리하는 라우트 핸들러를 만든다. **테스트를 먼저 쓰고 라우트를 쓴다(순서 엄수).**

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md`, `/docs/ADR.md`, `/CLAUDE.md`(서버 전용 규칙)
- `app/api/analyses/route.ts` — auth(`createServerClient` → `auth.getUser()` → 401), 입력 검증, `NextResponse.json` 에러 패턴의 정본. **이 패턴을 그대로 따른다.**
- `tests/billing-polar.test.ts` — 라우트 테스트 작성법(`next/server`·`supabase` 모킹 후 핸들러 import) 정본.
- `lib/supabase/server.ts`, `lib/categories.ts`(`CATEGORY_IDS`), `types/budget.ts`(step 0).

## 작업

> ⚠️ **순서 강제**: 먼저 `tests/budget.test.ts`를 만들고, 그다음 `app/api/budgets/route.ts`를 만든다.
> TDD 가드가 라우트의 테스트(이 route의 핸들러를 import) 없이는 `route.ts` 작성을 차단한다.

1. `tests/budget.test.ts` — `tests/billing-polar.test.ts`처럼 `next/server`와 `lib/supabase/server`를 모킹하고 `import { GET, PUT } from "../app/api/budgets/route"`. 케이스: 미인증 401, 잘못된 category 400, 음수 limit 400, 정상 upsert 200.

2. `app/api/budgets/route.ts`:
   - `GET(request)`: 인증 필수. `?period=YYYY-MM`(없으면 `currentPeriod(new Date())`, `lib/entitlements`). 해당 user·period의 budgets 반환.
   - `PUT(request)`: 인증 필수. body `{ category, period?, limit }`. 검증: `CATEGORY_IDS.includes(category)`, `limit`이 유한·`>= 0`. `budgets`에 `(user_id, category, period)` 기준 upsert. 성공 시 저장된 행 반환.
   - 모든 에러는 `NextResponse.json({ error }, { status })`. 401/400/500 구분. 내부 에러 메시지는 로그로만, 응답은 일반 메시지.

## Acceptance Criteria

```bash
npm run build
npm test        # tests/budget.test.ts 포함 통과
```

## 검증 절차

1. 위 AC 실행.
2. 체크리스트: 모든 외부 로직이 서버 라우트에 있는가(클라이언트 노출 0)? 입력 검증이 enum/숫자 범위를 막는가? RLS에 의존하되 쿼리에 `user_id`도 거는가?
3. step 2를 `completed` + `summary`(엔드포인트·검증 규칙).

## 금지사항

- 테스트보다 `route.ts`를 먼저 만들지 마라. 이유: 가드가 차단하고, 무인 실행이 멈춘다.
- 클라이언트 컴포넌트에서 budgets를 직접 쓰지 마라. 이유: 외부/DB 로직은 서버 전용(CLAUDE.md CRITICAL).
- category 검증을 생략하지 마라. 이유: 고정 enum 강제.

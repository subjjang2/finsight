# Step 6: auth-flow

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (auth/callback, dashboard force-dynamic, Server Components 기본)
- `/docs/ADR.md` (ADR-002 Supabase Auth, RLS는 auth.uid 스코프)
- `/docs/PRD.md` (MVP 제외: 소셜 로그인 다종·MFA → 이메일/비번 1종)
- `/docs/UI_GUIDE.md` (다크 테마, 입력/버튼 컴포넌트 스타일, AI 슬롭 금지)
- `/docs/prototype/js/screens.jsx`의 `AuthScreen` (레퍼런스 UI)
- step 3 산출물: `lib/supabase/server.ts`(createServerClient)

## 작업

Supabase **이메일/비밀번호** 인증 흐름을 구현한다. 소셜 로그인·MFA는 만들지 않는다(PRD MVP 제외).

1. **로그인/회원가입 페이지** — `app/(auth)/login/page.tsx`(또는 `app/login`). 이메일·비밀번호 폼(Client Component). 회원가입/로그인 토글 또는 분리. `UI_GUIDE`의 입력 필드·버튼 스타일 사용. 4상태(로딩/에러/빈/성공) 처리.
2. **인증 액션** — Server Action 또는 `app/api/auth/*` 라우트로 `signInWithPassword` / `signUp` 호출(`lib/supabase/server.ts` 사용). 성공 시 세션 쿠키 설정 후 `/dashboard`로 redirect.
3. **세션 미들웨어** — `middleware.ts`로 Supabase 세션 갱신(`@supabase/ssr` 권장 패턴). `/dashboard/*`는 미인증 시 `/login` redirect, 인증 상태에서 `/login` 접근 시 `/dashboard` redirect.
4. **`auth/callback`** — `app/auth/callback/route.ts`. (이메일 확인 링크/세션 교환 처리. 소셜 OAuth는 미사용이나 이메일 확인 플로우용 콜백은 유지.)
5. **로그아웃** — signOut 액션 + 셸 버튼 연결 지점(셸은 step 8). 최소 액션만 둔다.
6. **profiles row**: step 2의 트리거가 가입 시 자동 생성하므로 앱에서 중복 생성하지 않는다. 트리거가 없다면(미적용) 첫 로그인 시 upsert로 보강하되 RLS 본인 범위 내에서만.

페이지는 `lang="ko"` 한국어 카피. 임시 `app/page.tsx` 랜딩에 로그인 진입 링크를 둔다.

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음, 미들웨어 포함 빌드 성공
npm test        # 기존 테스트 회귀 없음
```
(실제 로그인 동작은 라이브 Supabase 필요 — 빌드/타입 통과까지 검증. 라이브 검증은 blocked 사유 아님: 코드 완성이 목표.)

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 이메일/비번 1종만, 소셜·MFA 없음 (PRD MVP 제외)
   - 인증/세션 처리가 서버(미들웨어·서버액션·라우트)에서 수행 (ARCHITECTURE)
   - 입력/버튼이 `UI_GUIDE` 스타일, AI 슬롭 안티패턴 미사용
   - `/dashboard` 미인증 접근 차단
3. 결과에 따라 `phases/0-mvp/index.json`의 step 6을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "로그인/회원가입·미들웨어·콜백 경로 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- 소셜 로그인(Google 등)·MFA를 구현하지 마라. 이유: PRD MVP 제외, 범위 확대.
- 클라이언트에서 직접 service-role 키나 DB를 다루지 마라. 이유: AGENTS.md CRITICAL.
- 인증 상태를 클라이언트 전역 상태 라이브러리로 관리하지 마라. 이유: ARCHITECTURE는 SSR 세션 기반.
- 기존 테스트를 깨뜨리지 마라.

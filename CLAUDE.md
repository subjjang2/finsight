# 프로젝트: finsight

CSV(카드 명세서) 업로드 → Claude 분석 → 인사이트 대시보드. 랜딩 + Polar 구독(Free·Pro).

## 기술 스택
- Next.js 15 App Router (루트 `app/`, **`src/` 디렉토리 쓰지 않음**)
- TypeScript strict mode
- Tailwind CSS
- Supabase (Auth + Postgres + Storage), `@supabase/ssr`
- Polar.sh (`@polar-sh/nextjs`) 구독
- Anthropic Claude (`@anthropic-ai/sdk`, 모델 `claude-sonnet-4-6`)
- 테스트: Vitest
- 배포: Railway (Nixpacks, `next start -p $PORT`)

## 아키텍처 규칙
- CRITICAL: 모든 외부 API 로직은 `app/api/` 라우트 핸들러 또는 `services/`·`lib/`에서만 처리. 클라이언트 컴포넌트에서 외부 API·시크릿 직접 호출 금지.
- CRITICAL: 인증은 `getUser()`(서버 검증)만 신뢰. 모든 사용자 데이터 접근은 `auth.uid()` 스코프 + DB/Storage RLS 2중 방어.
- CRITICAL: 사용자 데이터 R/W 서버 라우트는 **user-scoped SSR 클라**(`createServerClient` + 세션 쿠키)로 수행. **service-role 키는 Polar 웹훅 라우트에서만** 사용. 둘을 섞지 말 것.
- CRITICAL: 외부 클라이언트(Supabase service / Anthropic / Polar)는 모듈 top-level이 아니라 **함수 내부에서 lazy 생성**. 라이브 키 없이 빌드가 통과해야 한다.
- CRITICAL: Free/Pro 한도는 **서버사이드에서만** 강제. 클라이언트 우회 불가.
- 디렉토리: 컴포넌트 `components/`, 타입 `types/`, 순수 유틸 `lib/`, 외부 API 래퍼 `services/`.
- 절대 URL은 `NEXT_PUBLIC_SITE_URL` 단일 출처.

## 개발 프로세스
- CRITICAL: 새 기능은 테스트 먼저 작성 후 통과 구현(TDD). `route.ts`/`middleware.ts`/컴포넌트 `.tsx`는 콜로케이트 테스트 필수(예외: `page`/`layout`/`loading`/`error`/`not-found`).
- CRITICAL: 유료/외부 SDK(Anthropic·Polar·Supabase)는 테스트에서 전부 mock(실제 토큰·과금 호출 0).
- 커밋 메시지는 conventional commits(feat:, fix:, docs:, refactor:, chore:, test:).

## 명령어
```
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run test     # Vitest (CI 모드: vitest run)
```

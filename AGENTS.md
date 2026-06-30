# 프로젝트: finsight

카드 명세서 CSV를 업로드하면 Claude(Sonnet)가 거래를 자동 분류·집계해 지출 인사이트를 보여주는 AI 가계 분석 SaaS. 상세는 `docs/PRD.md`·`docs/ARCHITECTURE.md`·`docs/ADR.md` 참조.

> 이 프로젝트의 단계(phase) 실행은 `codex exec` 기반 `scripts/execute.py` 하네스로 진행한다. 하네스는 매 step 프롬프트에 이 AGENTS.md와 `docs/*.md`를 가드레일로 주입한다.

## 기술 스택
- Next.js 15 (App Router) 풀스택
- TypeScript (strict mode)
- Tailwind CSS (디자인 토큰은 `docs/UI_GUIDE.md`)
- Supabase (Postgres + Auth + RLS + Storage)
- Anthropic Claude Sonnet (CSV 컬럼 매핑 + 거래 분류)
- Polar (구독 결제, Merchant of Record)
- 배포: Railway (상시 컨테이너, `output: "standalone"`)

## 아키텍처 규칙
- CRITICAL: 모든 외부 API 로직(Claude 호출, CSV 파싱, Polar webhook, Supabase service-role 사용)은 `app/api/` 라우트 핸들러 또는 서버 전용 모듈에서만 처리한다.
- CRITICAL: 클라이언트 컴포넌트/번들에 비밀 키를 노출하지 않는다. `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POLAR_*`는 서버 전용. 클라이언트엔 `NEXT_PUBLIC_*`만.
- CRITICAL: 금융 PII가 담긴 테이블(transactions 등)은 RLS를 강제해 소유자만 접근하게 한다. RLS 없는 PII 테이블 생성 금지.
- 거래 분류는 고정 카테고리 enum(10~12개)만 사용한다. AI가 임의 카테고리를 생성하지 않게 한다.
- 업로드 시 AI 컬럼 매핑 추정값으로 분석을 자동 실행한다(매핑 확인 단계 없음, `docs/UX_GUIDE.md` §3 정본). 매핑 실패 시 파일 선택 화면으로 복귀한다.
- 컴포넌트는 `components/`, 타입은 `types/`, 외부 API 래퍼는 `services/`, 유틸은 `lib/`에 분리한다.
- UI는 한국어. `docs/UI_GUIDE.md`의 AI-슬롭 안티패턴을 위반하지 않는다.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD). `scripts/hooks/tdd-guard.sh`가 강제.
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)
- 유료 API(Claude) 호출이 발생하는 작업은 실행 전 사용자에게 확인받는다.

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 (output: standalone)
npm run lint     # ESLint
npm run test     # 테스트

## 환경변수
ANTHROPIC_API_KEY                # 서버 전용
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL             # 절대 URL(OAuth 콜백·Polar 체크아웃 URL 빌드). 로컬 http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY        # 서버 전용
POLAR_ACCESS_TOKEN               # 서버 전용
POLAR_PRO_PRODUCT_ID             # 서버 전용, Pro 체크아웃 대상 상품
POLAR_WEBHOOK_SECRET             # 서버 전용
# POLAR_API_BASE                 # optional, sandbox 테스트 시에만. 기본값 https://api.polar.sh

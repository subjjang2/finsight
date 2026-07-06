# service-map — 근본원인 분석용 코드 지도

CI 실패의 원인을 짚을 때 "무엇이 무엇을 부르는가"(정적 import 경계)를 빠르게 잡기 위한 지도.
정본은 `docs/ARCHITECTURE.md`. 여기선 oncall 에이전트가 실패 지점 → 영향 범위를 판단할 요지만.

## 디렉토리 경계 (CLAUDE.md/AGENTS.md 규칙)
- `app/` — Next.js App Router 페이지 + `app/api/*/route.ts` 라우트 핸들러(서버).
- `services/` — 외부 API 래퍼. `services/claude.ts`·`services/github.ts`는 `import "server-only"` (서버 전용).
  `services/github.ts` = repository_dispatch로 판정 CI를 깨우는 래퍼(prod-alert).
- `lib/` — 유틸·도메인 로직(csv 파싱, analysis 집계, entitlements 한도, categories,
  billing, supabase 클라이언트).
- `components/` — 재사용 UI(클라이언트).
- `types/` — 공유 타입(tier·category·mapping·transaction). 여기 변경은 광범위 영향.
- `middleware.ts` — 인증 가드.

## 라우트 → 의존 (변경 영향 추적)
| route | 부르는 것 |
|-------|-----------|
| `app/api/uploads/route.ts` | services/claude, lib/csv, lib/supabase/server |
| `app/api/analyses/route.ts` | services/claude, lib/analysis, lib/entitlements, lib/supabase/server |
| `app/api/advice/route.ts` (Pro) | services/claude, lib/categories, lib/supabase/server |
| `app/api/polar/checkout/route.ts` | lib/billing/checkout, lib/supabase/server |
| `app/api/polar/webhook/route.ts` | lib/billing/polar(서명검증), lib/supabase/admin(service-role) |
| `app/api/posthog/error-alert/webhook/route.ts` | lib/oncall/posthog-webhook(검증/파싱), lib/supabase/admin(멱등 claim RPC), services/github(dispatch) |

## 근본원인 판단 힌트
- **타입 에러가 여러 파일에 번짐** → 대개 `types/*` 변경이 진원. 타입 정의를 먼저 확인.
- **테스트 실패** → 테스트는 소스 옆 `*.test.ts` colocate(Vitest). 기대값/픽스처와 구현 불일치.
  실패 테스트를 지우지 말고 구현 또는 기대값 중 "옳은 쪽"을 근거로 맞춘다.
- **lint 실패** → `eslint .` (eslint-config-next). 미사용 변수·import·hook 규칙 등.
- **build 실패** → `next build`. 타입 에러 또는 서버/클라이언트 경계 위반(클라이언트에서 서버
  전용 모듈 import 등). 서버 시크릿을 클라이언트로 옮겨 "고치지" 마라 — 경계를 지켜 고친다.

## 절대 건드리지 말 것(가짜 통과 방지)
- RLS 정책 완화/해제(금융 PII 테이블).
- 서버 전용 키(`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POLAR_*`)를 `NEXT_PUBLIC_*`로
  옮기거나 클라이언트 번들에 노출.
- 실패 테스트 삭제·skip.
이런 게 유일한 통과 경로라면 → 고치지 말고 진단만 담은 draft PR.

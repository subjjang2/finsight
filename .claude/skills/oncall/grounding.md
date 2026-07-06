# grounding — autopilot 근거 소스 지도

autopilot 답의 **모든 주장은 아래 4소스 중 하나에 붙어야** 한다. 근거 없이 그럴듯하게
지어내지 마라. 근거를 못 찾으면 draft에 "모름/확인 불가"로 남기고 사람에게 넘긴다.
코드 경계 지도는 [service-map.md](service-map.md) 참조.

## 원칙
- **최소권한.** 읽기만. 각 소스에서 답에 필요한 최소 범위만 조회한다.
- **인용 가능하게.** 내부向이면 근거를 `파일:라인`·쿼리·로그 라인으로 그대로 인용.
  유저向이면 근거로 답을 세우되 로그/DB 원문·PII·스택트레이스는 노출하지 않는다.
- **교차 확인.** 가능하면 2소스 이상으로 같은 사실을 확인(예: PostHog 에러 + 코드 경로).

## 1. 코드베이스 (로컬 정독) — "제품이 원래 어떻게 동작하나"
- 도구: Grep / Glob / Read (로컬). 셸 `cat`/`grep` 대신 전용 도구.
- 용도: 기대 동작·에러 메시지 출처·분기 조건·한도(entitlements)·카테고리 enum 확인.
- 시작점: `app/api/*/route.ts`(엔드포인트) → `services/`·`lib/`(로직). 경계는 service-map.
- 예: "분석이 안 뜬다" → `app/api/analyses/route.ts` → `lib/entitlements`(무료 한도) 확인.

## 2. PostHog (에러/이벤트 모니터링) — "실제로 무슨 일이 있었나"
- 도구: `mcp__claude_ai_PostHog__*` (연결됨, project 498374). 에러 추적·이벤트·세션.
- 용도: "방금 들어온 이 에러"의 빈도·최초 발생·영향 유저 수·재현 이벤트 흐름.
- 최소권한: 특정 에러/이벤트·기간으로 좁혀 조회. 전수 덤프 금지.
- PII 주의: person properties에 이메일 등 있으면 유저向 답에 그대로 옮기지 않는다.

## 3. Supabase DB — **READ-ONLY (SELECT 전용)**
- 도구: `mcp__supabase__execute_sql` 로 **SELECT 만**. `list_tables`·`get_logs`·`get_advisors` 읽기 OK.
- 용도: 특정 유저 상태·구독 tier·업로드/분석 레코드 존재 여부 확인(사실 확인용).
- **절대 금지:** `INSERT/UPDATE/DELETE`, `apply_migration`, tier 직접 변경, RLS 우회.
  구독을 직접 풀어주는 쓰기 금지. 변경이 필요하면 → **ESCALATE**(draft에 사유·대상 명시).
- 금융 PII 테이블(transactions 등): 필요한 컬럼·해당 유저 행만. 전체 스캔·PII 원문 노출 금지.

## 4. Railway 로그 — "서버/런타임에서 터졌나"
- 도구: `mcp__railway__get-logs` (읽기). 배포·런타임 로그.
- 용도: 500·크래시·배포 회귀의 서버측 근본원인. PostHog(클라)와 교차 확인.
- 최소권한: 관련 시간창·서비스로 좁혀 조회. read-only, 배포/재배포(accept-deploy 등) 금지.

## 근거 → 답 매핑 규칙
| 상황 | 주 근거 | 교차 근거 |
|------|---------|-----------|
| 유저가 겪은 에러 | PostHog 에러 | 코드 경로 + Railway 로그 |
| "왜 이 기능이 이렇게 동작?" | 코드베이스 | (필요 시) DB로 그 유저 상태 |
| "내 구독/한도" 문의 | Supabase SELECT | 코드의 entitlements 로직 |
| 서버 500/장애 | Railway 로그 | PostHog 영향 범위 |

두 소스가 충돌하면 단정하지 말고 draft에 충돌을 적어 사람에게 넘긴다.

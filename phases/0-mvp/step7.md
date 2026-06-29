# Step 7: api-layer

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (데이터 흐름, API 라우트 목록 uploads/analyses/polar/health, 미터링 규칙)
- `/docs/ADR.md` (ADR-003 user-scoped 저장, ADR-005 실패 503, ADR-007 매핑→확인→분류 2단계, ADR-008 enum)
- `/AGENTS.md` (CRITICAL: 외부 API 로직은 라우트/서버 전용, AI 매핑은 사용자 확인 후 분석)
- `/docs/PRD.md` (게이팅: 분석 횟수 월 카운트)
- step 1: `types/*`  / step 3: `lib/supabase/server.ts`, `lib/entitlements.ts`
- step 4: `lib/csv/*`  / step 5: `services/claude.ts`(mapColumns, classifyTransactions)

## 작업

`app/api/`에 라우트 핸들러를 만들어 step 4·5·3 로직을 오케스트레이션한다. **2단계 분석 흐름**(ADR-007)을 라우트로 표현한다.

1. **`POST app/api/uploads/route.ts`** — 멀티파트 CSV 수신.
   - 인증 확인(미인증 401). `lib/csv` 디코딩+파싱. Storage(`card-statements`)에 원본 업로드(user-scoped, 경로 `{user_id}/...`). `services/claude.mapColumns`로 컬럼 매핑 호출.
   - 응답: `{ uploadId, fileName, rowCount, headers, sampleRows, mapping: ColumnMapping[] }`. **여기서 분류하지 않는다** — 사용자 확인 단계로 넘김.
2. **`POST app/api/analyses/route.ts`** — 사용자가 확인·수정한 매핑으로 분석 실행.
   - 입력: `{ uploadId, mapping: ColumnMapping[] }`.
   - **미터링 선검사**: `lib/entitlements.canAnalyze(tier, count)` — 초과 시 `402`/`403`로 차단(분류 호출 전).
   - 매핑 적용해 `lib/csv.normalize`로 거래 정규화 → `services/claude.classifyTransactions` → 집계(`CategoryBreakdown`, total, count) → 요약.
   - user-scoped Supabase로 `transactions`·`insights` 저장. **성공 시에만** `profiles.monthly_analysis_count` 증가(`lib/entitlements`의 period 리셋 로직 사용).
   - Claude 실패 시 `503`(ADR-005, 재시도 없음). 응답: `{ insightId, insight: Insight }`.
3. **`GET app/api/health/route.ts`** — step 0에서 생성됨. 없으면 생성.

**핵심 규칙**:
- 미터링 +1은 **분석 성공 후에만**. 실패 시 카운트 증가 금지.
- 모든 DB 접근은 user-scoped 클라(RLS). service-role 사용 금지(웹훅 아님).
- 매핑(uploads)과 분류(analyses)는 **분리된 요청** — 사용자 확인 단계 보장(ADR-007, AGENTS.md).

**TDD**: 집계 로직(거래 배열 → CategoryBreakdown/total/count)과 미터링 분기는 순수 함수로 분리해 테스트를 먼저 작성하라. 라우트 핸들러 자체는 의존성 모킹이 과하면 집계/게이팅 단위테스트로 대체.

## Acceptance Criteria

```bash
npm test        # 집계·게이팅 단위테스트 통과 (실제 API/DB 호출 없음, 모킹)
npm run build   # 라우트 핸들러 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - uploads(매핑)와 analyses(분류)가 분리된 2요청 (ADR-007, AGENTS.md)
   - DB 접근이 user-scoped(RLS), service-role 미사용 (ADR-003)
   - 미터링 +1이 성공 후에만, Free 5건 초과 차단 (PRD 게이팅)
   - Claude 실패 시 503, 재시도 없음 (ADR-005)
   - 카테고리는 enum만 (ADR-008)
3. 결과에 따라 `phases/0-mvp/index.json`의 step 7을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "uploads/analyses/health 라우트 + 집계·게이팅 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- 한 요청에서 매핑과 분류를 모두 수행하지 마라. 이유: 사용자 확인 단계가 강제됨(ADR-007, AGENTS.md). 잘못된 매핑으로 오분석 방지.
- 분석 실패 시에도 카운트를 증가시키지 마라. 이유: 사용자가 실패에 과금/한도 소진되면 안 됨.
- 라우트에서 service-role 클라를 쓰지 마라. 이유: RLS 우회는 웹훅 전용(ADR-003).
- Claude 호출에 재시도 루프를 넣지 마라. 이유: MVP 제외(ADR-005).
- 기존 테스트를 깨뜨리지 마라.

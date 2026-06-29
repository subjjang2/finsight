# Step 9: dashboard-screens

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` (데이터 흐름, force-dynamic, 클라는 fetch로 자체 API 호출)
- `/docs/ADR.md` (ADR-007 매핑 확인 → 분석 2단계 UX)
- `/docs/PRD.md` (핵심 기능 1·2·3, 화면 흐름)
- `/docs/UI_GUIDE.md` + `finsight-ui` 스킬 (디자인 기준 — 코드 전 참조)
- `/docs/prototype/js/screens.jsx`(Upload/Mapping/Analyzing), `screens2.jsx`(Insights/Trend), `js/data.jsx`(데이터 형태)
- step 1: `types/*` / step 7: `app/api/uploads`·`app/api/analyses` 응답 형태
- step 8: `components/ui/*`, `components/shell/*`, `app/dashboard/layout.tsx`

## 작업

대시보드 화면을 만들어 step 7 API와 연결한다. 프로토타입 화면 흐름: **Upload → Mapping(확인) → Analyzing → Insights**, + **Trend**.

1. **Upload** (`app/dashboard/upload/page.tsx` + client 컴포넌트) — CSV 파일 선택, 이번 달 사용량 표시, `POST /api/uploads` 호출. 응답의 mapping을 받아 Mapping 단계로.
2. **Mapping 확인** — `uploads` 응답의 `mapping`(원본 컬럼·샘플·field·confidence)을 표로 보여주고 각 행의 field를 `Select`로 **수정 가능**하게. 확인 시 `POST /api/analyses`로 최종 매핑 전송. (ADR-007: 사용자 확인 필수.)
3. **Analyzing** — 분석 진행 로딩 상태(프로토타입 `AnalyzingScreen`). API 응답 대기.
4. **Insights** (`app/dashboard/page.tsx`, `force-dynamic`) — 서버 컴포넌트가 user-scoped Supabase로 최신 `insights`/`transactions` 조회. 카테고리별 합계·비율 표 + 서술형 요약 + 총액 Stat. 빈 상태(분석 이력 없음) 처리. `won`/`pct` 류 포맷 헬퍼는 `lib`에 두고 재사용.
5. **Trend** (`app/dashboard/trend/page.tsx`, `force-dynamic`) — 월별 추이(`MONTHLY` 형태)와 상위 카테고리 추이. CSS 막대로 표현(차트 라이브러리 금지).

per-user 데이터 페이지는 `force-dynamic`. 인터랙션 컴포넌트만 `"use client"`이며 클라는 **fetch로 자체 API 호출**(직접 DB/Claude 접근 금지). 한국어 카피, 금액 `₩`, 날짜 `YYYY-MM-DD`. 4상태 모두 시각화.

## Acceptance Criteria

```bash
npm run build   # 페이지·클라 컴포넌트 컴파일 에러 없음
npm test        # 포맷 헬퍼 등 단위테스트 통과, 회귀 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - Mapping 확인 단계가 분석 전에 존재하고 field 수정 가능 (ADR-007)
   - per-user 페이지 `force-dynamic`, 클라는 fetch로 API 호출(직접 외부접근 없음) (ARCHITECTURE)
   - 4상태(로딩/에러/빈/성공) 시각화
   - 차트 라이브러리 미사용, 표/CSS 막대 (PRD, UI_GUIDE)
   - UI_GUIDE 안티패턴 0건
3. 결과에 따라 `phases/0-mvp/index.json`의 step 9를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "upload/mapping/analyzing/insights/trend 화면 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- 매핑 확인 없이 업로드 직후 자동 분석으로 넘어가지 마라. 이유: ADR-007이 사용자 확인을 강제, 오매핑 방지.
- 클라이언트 컴포넌트에서 Supabase/Anthropic을 직접 호출하지 마라. 이유: AGENTS.md CRITICAL, 키 노출.
- 무거운 차트 라이브러리를 도입하지 마라. 이유: PRD MVP "텍스트 + 간단 표".
- 기존 테스트를 깨뜨리지 마라.

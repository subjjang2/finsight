# Architecture Decision Records

## 철학
MVP 속도 최우선. 외부 관리형 서비스(Supabase·Polar·Anthropic)에 인프라를 위임하고, CSV→AI 분석→인사이트라는 핵심 가치에만 집중한다. 작동하는 최소 구현 + 꼭 필요한 안전장치만. 외부 의존성·추상화 최소화. 단, 금융 PII를 다루므로 보안 기준선(RLS·암호화·삭제)은 MVP에서도 타협하지 않는다.

---

### ADR-001: Next.js 15 App Router (루트, `src/` 없음)
**결정**: App Router, 루트 `app/`. `src/` 디렉토리 쓰지 않음.
**이유**: 서버 컴포넌트 + 라우트 핸들러로 풀스택 일원화. 경로 단순화.
**트레이드오프**: Pages Router 생태계 일부 포기.

### ADR-002: Supabase (Auth + Postgres + Storage) + RLS 2중 방어
**결정**: 인증·DB·파일을 Supabase로. 모든 사용자 데이터에 RLS. 앱에서도 `auth.uid()` 스코프.
**이유**: 백엔드 직접 운영 회피. RLS로 IDOR·권한 우회를 DB 레벨에서 차단.
**트레이드오프**: Supabase 락인. RLS 정책 설계 비용.

### ADR-003: service-role은 웹훅 전용, 나머지는 user-scoped
**결정**: 사용자 데이터 R/W는 user-scoped SSR 클라(RLS 적용). service-role 키는 Polar 웹훅에서만.
**이유**: service-role은 RLS를 우회하므로 노출면 최소화. 세션 없는 웹훅에만 필요.
**트레이드오프**: Storage·테이블에 INSERT RLS 정책을 빠짐없이 작성해야 함.

### ADR-004: Polar.sh 구독, tier는 웹훅만 변경
**결정**: 결제는 Polar 호스팅. `profiles.tier`는 Polar 웹훅(멱등 upsert)으로만 갱신.
**이유**: 결제 UI·컴플라이언스 위임. tier 단일 진실원.
**트레이드오프**: Polar 의존. 웹훅 도달성에 의존.

### ADR-005: Claude `claude-sonnet-4-6` + structured output
**결정**: 분석은 `claude-sonnet-4-6`, `output_config.format`(JSON schema)로 구조화 출력. 1회 호출, 실패 시 503.
**이유**: 비용/지능 균형(입력 $3·출력 $15 per 1M). 스키마 강제로 파싱 안정화.
**트레이드오프**: Opus 대비 지능 낮음. 재시도·스트리밍은 MVP 제외.

### ADR-006: Railway + Nixpacks 배포
**결정**: Next.js 앱만 Railway 컨테이너로(`output: "standalone"` 빌드). DB/Auth/Storage는 Supabase 그대로.
**이유**: GitHub push 자동배포. Dockerfile 불필요. standalone으로 런타임 의존성 최소화. 상시 컨테이너라 동기 AI 분석의 타임아웃 제약 없음.
**트레이드오프**: 단일 프로덕션 환경(staging 없음). 서버리스 오토스케일 대신 상시 컨테이너 비용.

### ADR-007: CSV는 AI 자동 컬럼 매핑 + 사용자 확인
**결정**: 고정 템플릿/카드사 프리셋 대신, 헤더+샘플 몇 행을 Claude에 넘겨 `date/merchant/amount` 컬럼을 자동 매핑하고 사용자가 확인·수정한 뒤 분석.
**이유**: 카드사·은행마다 포맷이 제각각 → 어떤 명세서든 받아 UX 마찰 최소화. 언어/인코딩 무관.
**트레이드오프**: 매핑 토큰 비용·오매핑 리스크. → 매핑 확인 UI를 필수로 두어 잘못된 인사이트 방지.

### ADR-008: 고정 카테고리 enum (10~12개)
**결정**: AI 자율 생성이 아니라 고정 카테고리 집합으로 분류. 매칭 안 되는 건 `Other`.
**이유**: 전체 이력을 저장하고 월별 추이·비교를 보여주려면 업로드 간 카테고리 명칭이 일관돼야 함.
**트레이드오프**: 세밀함 손실. Other 비중 모니터링으로 보완.

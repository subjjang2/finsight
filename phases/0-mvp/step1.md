# Step 1: core-types

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/PRD.md` (카테고리 12개 enum, 티어 정의)
- `/docs/ARCHITECTURE.md` (데이터 모델: profiles/uploads/transactions/insights)
- `/docs/ADR.md` (ADR-008 고정 카테고리 enum, ADR-007 컬럼 매핑)
- `/docs/prototype/js/data.jsx` (`CATEGORIES`, `COLUMN_MAPPING`, `CLASSIFIED`, `PRICING` 형태 — 타입의 정본 레퍼런스)
- step 0 산출물: `package.json`, `tsconfig.json`(strict 확인)

이전 step에서 만들어진 설정을 읽고 strict TS 환경을 전제로 작업하라.

## 작업

앱 전역에서 공유할 순수 TypeScript 타입과 카테고리 상수를 정의한다. **런타임 의존성 없는 순수 모듈만** 작성한다.

1. **`types/category.ts`** — 고정 12개 카테고리.
   - `export type Category = 'dining' | 'shopping' | 'grocery' | 'cafe' | 'transport' | 'utilities' | 'leisure' | 'medical' | 'finance' | 'education' | 'travel' | 'etc'`
   - 분류 불가 시 fallback은 `'etc'`로 한다(ADR-008의 Other 역할). 별도 카테고리를 추가하지 마라.
2. **`lib/categories.ts`** — `CATEGORIES` 배열(`{ id: Category; label: string }`), `data.jsx`의 한국어 label과 동일하게. `CATEGORY_IDS: Category[]`, `isCategory(x: string): x is Category`, `categoryLabel(id: Category): string` 헬퍼.
3. **`types/tier.ts`** — `export type Tier = 'free' | 'pro'`. 한도 상수 `FREE_MONTHLY_LIMIT = 5`, `PRO_FAIR_USE_LIMIT = 200`, 1파일 행 상한 `MAX_ROWS_PER_UPLOAD = 1000`.
4. **`types/mapping.ts`** — CSV 컬럼 매핑.
   - `export type MappingField = 'date' | 'merchant' | 'amount' | 'ignore'`
   - `export interface ColumnMapping { source: string; sample: string; field: MappingField; confidence: number }`
5. **`types/transaction.ts`** — 거래/집계.
   - `export interface Transaction { date: string; merchant: string; amount: number; category: Category }` (date는 `YYYY-MM-DD`)
   - `export interface CategoryBreakdown { id: Category; amount: number; count: number }`
   - `export interface Insight { total: number; count: number; breakdown: CategoryBreakdown[]; summary: string }`

각 타입 파일에 대한 단위테스트(`isCategory`, `categoryLabel`, `CATEGORIES` 12개 길이 검증 등)를 작성한다. **TDD: 테스트를 먼저 작성하라**(`scripts/hooks/tdd-guard.sh` 강제).

## Acceptance Criteria

```bash
npm run build   # 타입 에러 없음
npm test        # categories/helpers 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 카테고리는 정확히 12개, `PRD.md`·`data.jsx`와 id·label 일치 (ADR-008)
   - 타입 파일은 `types/`, 헬퍼는 `lib/`에 위치 (ARCHITECTURE 디렉토리 규칙)
   - 런타임 import(supabase/anthropic 등) 없음 — 순수 모듈
3. 결과에 따라 `phases/0-mvp/index.json`의 step 1을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "생성한 타입 파일·카테고리 헬퍼 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- 카테고리를 12개에서 늘리거나 줄이지 마라. 이유: 월별 추이 비교를 위해 업로드 간 카테고리가 일관돼야 한다(ADR-008).
- 타입 파일에 외부 API/DB 클라이언트를 import 하지 마라. 이유: 순수 타입 레이어 유지, 클라/서버 양쪽에서 안전하게 재사용.
- 기존 테스트를 깨뜨리지 마라.

# Step 3: budget-analysis

예산 대비 실지출을 평가하는 순수 함수를 만든다(단위 TDD 대상).

## 읽어야 할 파일

- `/docs/ARCHITECTURE.md`
- `lib/analysis.ts` — 순수 집계 함수 스타일(`buildInsight`, `CATEGORY_IDS` 사용) 정본. **이 스타일을 따른다.**
- `types/budget.ts`(step 0), `types/transaction.ts`(`CategoryBreakdown`), `lib/categories.ts`.
- 기존 단위 테스트 예: `tests/analysis.test.ts`.

## 작업

> ⚠️ TDD: `lib/budget.test.ts`를 먼저 쓰고 `lib/budget.ts`를 구현한다.

`lib/budget.ts`:

```ts
import type { Budget, BudgetStatus } from "../types/budget";
import type { CategoryBreakdown } from "../types/transaction";

// breakdown: 해당 기간의 카테고리별 실지출(Insight.breakdown 모양).
// warningThreshold 기본 0.8. ratio >= 1 → "over", >= warning → "warning", else "ok".
// limit === 0 인 예산은 ratio 계산 시 0 나눗셈을 피한다(spent>0이면 over로 본다).
export function evaluateBudgets(
  budgets: Budget[],
  breakdown: CategoryBreakdown[],
  warningThreshold?: number,
): BudgetStatus[];
```

규칙:
- budget이 있는 카테고리만 결과에 포함, 입력 `budgets` 순서 유지.
- `spent`는 breakdown에서 같은 category의 `amount`(없으면 0).
- 경계: ratio가 정확히 0.8 → warning, 정확히 1.0 → over.

## Acceptance Criteria

```bash
npm run build
npm test        # lib/budget.test.ts 포함 통과
```

## 검증 절차

1. 위 AC 실행.
2. 체크리스트: 순수 함수인가(부수효과·I/O 없음)? 0 나눗셈·빈 배열·임계 경계 케이스가 테스트에 있는가?
3. step 3을 `completed` + `summary`.

## 금지사항

- 이 함수 안에서 Supabase/네트워크를 호출하지 마라. 이유: 순수 로직만, I/O는 라우트 책임.
- 구현 먼저 쓰지 마라(테스트 선행). 이유: TDD 가드.

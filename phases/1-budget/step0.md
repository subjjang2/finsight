# Step 0: budget-types

카테고리별 월 예산(Budget) 기능의 도메인 타입을 정의한다. 이 step은 타입만 만든다.

## 읽어야 할 파일

먼저 아래를 읽고 기존 타입 컨벤션·카테고리 enum을 파악하라:

- `/docs/ARCHITECTURE.md`, `/docs/ADR.md`
- `types/category.ts` — `Category` 유니온(12개). **이 enum을 그대로 재사용**한다.
- `types/transaction.ts` — `CategoryBreakdown`(분석 집계 결과 모양) 참고.

## 작업

`types/budget.ts`를 새로 만든다. 시그니처:

```ts
import type { Category } from "./category";

export interface Budget {
  category: Category;   // 고정 enum 재사용 — 새 카테고리 만들지 말 것
  period: string;       // 'YYYY-MM'
  limit: number;        // KRW, 정수/양수 (>= 0)
}

export type BudgetLevel = "ok" | "warning" | "over";

export interface BudgetStatus extends Budget {
  spent: number;        // 해당 period·카테고리 실지출 합
  ratio: number;        // spent / limit (limit > 0 일 때)
  level: BudgetLevel;   // 임계값에 따른 단계
}
```

## Acceptance Criteria

```bash
npm run build   # 컴파일 에러 없음
npm test        # 기존 테스트 통과
```

## 검증 절차

1. 위 AC 실행.
2. 체크리스트: `types/`에 위치하는가? `Category`를 재정의하지 않고 import 하는가? ADR 스택 위반 없는가?
3. `phases/1-budget/index.json`의 step 0을 `completed` + `summary`(생성 파일·export 목록)로 갱신.

## 금지사항

- 새 카테고리 문자열을 정의하지 마라. 이유: 거래 분류는 고정 enum만 쓴다(CLAUDE.md CRITICAL).
- 여기서 lib/db/api 코드를 만들지 마라. 이유: step 1 레이어 분리 원칙 위반.
- 기존 테스트를 깨뜨리지 마라.

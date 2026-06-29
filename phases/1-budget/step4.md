# Step 4: budget-ui

예산 현황을 대시보드에 카드로 보여준다.

## 읽어야 할 파일

- **finsight-ui 스킬** + `docs/UI_GUIDE.md`(색·토큰·상태), `docs/UX_GUIDE.md`(흐름), `docs/COMPONENTS.md`(조립 단위) — **코드 쓰기 전 반드시 확인**.
- `docs/prototype/js/ui.jsx` — `Panel`, `Stat`, `HBar`(가로 막대) 등 공용 primitive 패턴.
- `app/dashboard/page.tsx` — 서버 컴포넌트에서 supabase 조회 → 컴포넌트 렌더 패턴, `components/ui`·`lib/format`(`won`, `pct`) 사용법.
- `lib/budget.ts`(step 3), `types/budget.ts`(step 0), `lib/entitlements`(`currentPeriod`).

## 작업

1. `components/budget/BudgetCard.tsx` — props `{ statuses: BudgetStatus[] }`. 카테고리별 한 줄: 라벨 + 진행 막대 + `spent/limit`(₩, `tabular-nums`). level별 색: `ok`=emerald, `warning`=amber, `over`=red(`--down`). 빈 배열이면 EmptyState(예산 설정 유도 — UX_GUIDE의 다음 행동 원칙).

2. `app/dashboard/page.tsx` 수정 — 현재 기간 budgets 조회(`budgets` 테이블, `currentPeriod`) + 최신 insight의 `breakdown`을 `evaluateBudgets`에 넘겨 `BudgetCard` 렌더. 기존 인사이트 카드 흐름을 깨지 않게 **추가**한다.

## Acceptance Criteria

```bash
npm run build
npm test
```

## 검증 절차

1. 위 AC 실행.
2. 체크리스트: UI_GUIDE 토큰만 사용했는가(임의 색 금지)? 로딩/에러/빈/성공 4상태 구분? 다크+emerald 톤·AI-슬롭 안티패턴 위반 없는가? 금액 `tabular-nums`·₩?
3. step 4를 `completed` + `summary`.

## 금지사항

- 새 색/토큰을 즉흥으로 만들지 마라. 이유: UI_GUIDE 정본 우선.
- 클라이언트에서 budgets를 직접 fetch하지 마라(서버 컴포넌트에서 조회해 props로). 이유: 서버 전용 규칙.
- 기존 대시보드 카드/흐름을 제거하지 마라. 이유: 추가 기능이다.

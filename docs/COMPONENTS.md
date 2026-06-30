# 컴포넌트 카탈로그

> finsight의 재사용 컴포넌트 단일 진실 소스. **조립 단위**를 정의한다.
> 원칙·토큰은 `docs/UI_GUIDE.md`, 화면 흐름은 `docs/UX_GUIDE.md`, 토큰 hex는 `docs/prototype/Finsight.html`의 `:root`가 정본.
> 새 컴포넌트를 추가하거나 props/변형을 바꾸면 **이 문서를 같이 갱신**한다. 코드와 어긋나면 코드가 우선이고 이 문서를 고친다.

색상은 Tailwind 시맨틱 토큰(`bg-surface`, `text-ink`, `border-line`, `bg-accent`, `text-muted`, `bg-surface-2/3`, `text-error`)으로만 쓴다. 임의 hex 금지.

---

## ui/ — primitive (`components/ui/index.tsx`)

서버/클라이언트 양쪽에서 쓰는 무상태 프레젠테이션 컴포넌트.

### `Card`
컨테이너 기본. `div` 확장 (`...HTMLAttributes`).
- 기본: `rounded-lg border border-line bg-surface p-6 text-ink`
- 패딩 0이 필요한 표·헤더 분리형은 `className="p-0"`로 덮고 내부에서 `border-b border-line p-6` 섹션을 직접 구성.
- 모든 패널/표/상태 카드의 기반.

### `Button`
- props: 표준 `button` 속성 + `variant?: "primary" | "accent" | "text"` (기본 `primary`), `type` 기본 `"button"`.
- variant:
  - `primary` — 흰 배경 검정 글씨 (`bg-white text-black`). 화면의 기본 확정 액션.
  - `accent` — emerald (`bg-accent text-black`). **다음 단계로 가는 단 하나의 버튼**에만 (UX_GUIDE 대비 원칙). 예: 매핑 화면 "분석 실행".
  - `text` — 무배경 보조 액션 (`text-muted`, 패딩 0). 예: "다시 선택", "다른 파일".
- `disabled` 시 `opacity-50 cursor-not-allowed` 자동.
- 한 화면에 accent 버튼은 1개 원칙(UX_GUIDE §3).

### `Input`
- `input` 확장. 전체폭, `bg-surface-2 border-line`, focus 시 `bg-surface`.
- placeholder는 `text-muted-soft`.

### `Select`
- `select` 확장. `appearance-none` + 우측 chevron SVG(strokeWidth 1.5) 직접 렌더.
- 접근성: 호출부에서 `aria-label` 부여 (예: UploadFlow의 매핑 필드 선택).

### `Badge`
- `span` 확장. 외곽선 있는 라벨 (`border-line bg-surface-2 text-muted text-xs`).
- 용도: 보조 메타 표기. 예: 사용량 "월 5건", "이번 달 3/5건".

### `Chip`
- `span` 확장. 외곽선 없는 채움형 (`bg-surface-3 text-ink`).
- 용도: 카테고리 태그 등 값 표시.

### `Stat`
- props: `label: string`, `value: ReactNode`, `helper?: ReactNode`, `className?`.
- `Card` 위에 라벨/큰 숫자/보조설명 3단. 숫자는 `text-2xl font-semibold tabular-nums`.
- 용도: 인사이트 상단 핵심 지표(총 지출, 1위 카테고리). 위계 1순위(UX_GUIDE §1).

### 상태 컴포넌트 — 4상태 (UI_GUIDE 필수)
내부 `StateCard`/`StateIcon` 위의 래퍼. 모든 데이터 UI는 아래 4개로 상태를 시각 구분.
- `LoadingState` — props `label?` (기본 "불러오는 중").
- `ErrorState` — props `title?`(기본 "오류가 발생했습니다"), `message?`. 아이콘 `text-error`.
- `EmptyState` — props `title?`, `message?`. **막다른 길이 아니라 다음 행동을 안내**(UX_GUIDE §3.5).
- `SuccessState` — props `title?`(기본 "완료"), `message?`.

> 내부 헬퍼 `StateCard`, `StateIcon`은 export 안 함. 새 상태 표현이 필요하면 위 4개 래퍼를 쓰거나 확장한다.

---

## shell/ — 레이아웃 (`components/shell/`)

`index.ts`에서 `DashboardShell`, `Sidebar`, 타입 `SidebarPlan` export.

### `DashboardShell`
- props: `children`, `currentPath?`, `plan?: SidebarPlan`(기본 `"free"`), `used?`(기본 0), `limit?`(기본 5).
- 좌측 `Sidebar` + 우측 `main`(`max-w-6xl px-8 py-10`). 모든 대시보드 페이지의 래퍼.

### `Sidebar`
- props: `currentPath?`, `plan?`, `used?`, `limit?`.
- 내부: `Logo`(emerald 라운드 로고), 4개 `NAV_ITEMS`(인사이트/업로드/월별 추이/요금제), `UsageMeter`, 로그아웃 폼(`signOut` 서버 액션).
- nav active: `/dashboard`는 정확 일치, 나머지는 `startsWith`.
- 아이콘은 인라인 SVG(strokeWidth 1.5), 둥근 배경 박스로 감싸지 않음.
- `SidebarPlan = "free" | "pro"`.

#### `UsageMeter` (Sidebar 내부, 비공개)
- 플랜 배지 + "이번 달 분석 used/limit" + 진행 바(`bg-accent`, 100% cap).
- 한도 도달 시 Pro 전환 트리거 지점(UX_GUIDE §단계 7)과 연결.

---

## dashboard/ — 기능 컴포넌트 (`components/dashboard/`)

### `UploadFlow` (`UploadFlow.tsx`, `"use client"`)
업로드 → 매핑 확인 → 분석 → 완료의 **4단계 클라이언트 플로우**. UX_GUIDE 단계 2~5의 구현.
- props: `used: number`, `limit: number`.
- 내부 상태: `Stage = "select" | "mapping" | "analyzing" | "done"`.
- API: `POST /api/uploads`(매핑 추정) → `POST /api/analyses`(분석). 완료 시 `/dashboard`로 push + refresh.
- 핵심 UX 규칙 반영:
  - 파일 선택 즉시 자동 업로드·매핑 진입(자동 전진, UX_GUIDE §3.2).
  - 매핑은 AI 추정값을 **미리 채운 상태**로 보여주고 사용자가 확인/수정(CLAUDE.md 필수 단계).
  - `REQUIRED_FIELDS = date/merchant/amount` 모두 매핑돼야 "분석 실행"(accent) 활성.
  - 에러는 처음으로 되돌리지 않고 같은 단계에서 복구(`mapping`/`select` 유지).
- 하위(파일 내부, 비공개): `MappingReview`(매핑 표 + 신뢰도 % + 미리보기), `PreviewTable`(원본 샘플 표).
- 타입: `types/mapping.ts`의 `ColumnMapping`, `MappingField`.

### `CategoryDonut` (`CategoryDonut.tsx`)
카테고리별 지출을 **도넛 차트 + 범례**로 표현하는 무상태 프레젠테이션 컴포넌트. 인사이트 화면의 "카테고리별 지출" 카드 본문.
- props: `rows: { id: Category; amount: number; count?: number }[]`(금액 내림차순 정렬 전제), `total: number`.
- 좌측 인라인 SVG 도넛(size 168, stroke 14, `-rotate-90`으로 12시 시작) + 중앙 "총 지출" 금액, 우측 범례(색 스와치·라벨·비율·금액).
- 색은 `emeraldScale(i, n)` 순차 스케일 — i=0이 가장 밝은 emerald, 순위가 낮을수록 중성 회색으로 페이드. 배경 트랙은 `var(--surface-3)`. (도구형 톤 유지, 임의 다색 팔레트 금지.)
- 같이 export하는 순수 함수(테스트 대상):
  - `emeraldScale(i, n): string` — OKLCH 색 문자열(반올림으로 안정적).
  - `donutSegments(rows, total, size): DonutSegment[]` — arc 기하(dash 길이·offset). `total <= 0`이거나 `amount <= 0`인 행은 제외.
- 금액 `₩`+`tabular-nums`, 비율은 `pct()`(소수 1자리). amount가 0 이하인 카테고리는 도넛·범례 모두에서 생략.

### `ProAnalysisPanel` (`ProAnalysisPanel.tsx`, `"use client"`)
카테고리 도넛 **오른쪽**에 붙는 Pro 전용 분석 패널. 인사이트 화면 도넛과 2열(`lg:grid-cols-[1.7fr_1fr]`) 배치.
- props: `plan: "free" | "pro"`, `initialAdvice: string | null`(캐시된 조언), `hasInsight: boolean`.
- 3가지 뷰(순수 함수 `proAnalysisInitialView(plan, initialAdvice)`로 결정, 테스트 대상):
  - `locked`(Free) — 자물쇠 아이콘 + 잠금 안내 + `Pro로 업그레이드`(accent) 버튼. 클릭 시 `POST /api/polar/checkout`(Accept: application/json)로 `{ url }`을 받아 Polar 체크아웃으로 이동. "Polar가 결제와 세금 처리를 담당합니다." 보조문구.
  - `idle`(Pro·캐시 없음) — `분석 생성하기`(accent) 버튼. `hasInsight=false`면 비활성 + 안내.
  - `result`(Pro·조언 있음) — 조언 본문(`whitespace-pre-wrap`) + `다시 생성`(text) 버튼.
- 생성/재생성은 `POST /api/advice`(`{ regenerate }`) 호출. 호출 중에는 **인디터미닛 프로그래스 바**(`AnalyzingBar`, `@keyframes indeterminate-bar`는 `globals.css`) 표시. 실패 시 인라인 `text-error` 메시지.
- 비용: advice 호출은 명세서당 1회만 일어나도록 결과를 `insights.advice`에 캐시(`/api/advice`가 관리). "다시 생성"으로만 재호출.
- 같이 export: `proAnalysisInitialView`, 타입 `ProAnalysisView = "locked" | "idle" | "result"`.

---

## 추가 시 규칙
1. 범용 무상태 primitive → `ui/`. 레이아웃 → `shell/`. 특정 기능 플로우 → `dashboard/`(또는 기능명 폴더).
2. variant는 문자열 union + `Record<Variant, string>` 매핑 패턴(`Button` 참고).
3. 색/간격은 시맨틱 토큰만. 새 토큰이 필요하면 `UI_GUIDE.md`·`Finsight.html` `:root`에 먼저 정의.
4. 데이터를 표시하는 컴포넌트는 로딩/에러/빈/성공 4상태를 호출부에서 처리할 수 있게 설계.
5. 새 컴포넌트·변형·prop 변경 시 이 문서를 같은 커밋에서 갱신.

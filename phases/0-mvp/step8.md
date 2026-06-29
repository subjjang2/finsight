# Step 8: ui-foundation

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/UI_GUIDE.md` (색상 토큰, 컴포넌트 스타일, 4상태, 타이포, 안티패턴 — 전부 준수)
- `/docs/prototype/Finsight.html` 의 `:root` (토큰 hex 정본)
- `/docs/prototype/js/ui.jsx` (primitive 컴포넌트 레퍼런스), `js/app.jsx`의 `Sidebar`
- step 0 산출물: `app/globals.css`, Tailwind 토큰 설정
- `finsight-ui` 스킬: UI 작업 전 반드시 참조(브랜드/디자인 기준). 코드 쓰기 전에 읽어라.

## 작업

대시보드 화면들이 공유할 UI primitive와 셸을 만든다. **데이터 페칭·화면 로직은 다음 step(9)** — 여기서는 재사용 컴포넌트와 레이아웃만.

1. **`components/ui/`** primitive (Server Component 가능, 인터랙션만 client):
   - `Card`(`rounded-lg bg-[surface] border border-[line] p-6`), `Button`(Primary 흰배경/Accent emerald/Text variant), `Input`, `Select`(프로토타입 `screens.jsx`의 `Select` 참조), `Badge/Chip`.
   - `Stat`(금액 강조 `text-2xl font-semibold tabular-nums`), `EmptyState`/`LoadingState`/`ErrorState` (4상태 — UI_GUIDE 필수).
   - SVG 아이콘은 인라인 `strokeWidth={1.5}`, 둥근 배경 박스로 감싸지 않는다.
2. **`components/shell/`** 대시보드 셸:
   - `Sidebar`(insights/upload/trend/pricing 네비, 현재 플랜·이번 달 사용량 표시 — 프로토타입 `app.jsx` Sidebar 참조), 로그아웃 버튼(step 6 액션 연결).
   - `DashboardShell`(사이드바 + max-w-6xl 콘텐츠 영역). 랜딩은 max-w-5xl.
3. **`app/dashboard/layout.tsx`** — `DashboardShell` 적용. `force-dynamic`(per-user)은 페이지 단(step 9)에서 설정.

모든 컴포넌트는 다크 토큰 사용, 한국어 카피, fade-in/slide-up 외 애니메이션 금지.

## Acceptance Criteria

```bash
npm run build   # 컴포넌트 컴파일 에러 없음
npm test        # 회귀 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 색상 토큰이 `Finsight.html` `:root`와 일치 (UI_GUIDE)
   - AI 슬롭 안티패턴 0건: gradient-text·backdrop-blur·네온 글로우·보라/인디고·gradient orb·전부 rounded-2xl 없음
   - 4상태 컴포넌트(로딩/에러/빈/성공) 존재
   - 컴포넌트는 `components/`, 인터랙션 컴포넌트만 `"use client"`
   - 아이콘 strokeWidth 1.5, 컨테이너 박스 없음
3. 결과에 따라 `phases/0-mvp/index.json`의 step 8을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "ui primitive·shell·dashboard layout 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- UI_GUIDE의 안티패턴(glass morphism, gradient-text, 네온 글로우, 보라/인디고, gradient orb, 모든 카드 rounded-2xl)을 쓰지 마라. 이유: AI 슬롭 = 브랜드 위반.
- 차트 라이브러리를 과다 도입하지 마라. 이유: PRD MVP "텍스트 + 간단 표". 막대/추이는 CSS/div로 충분.
- 데이터 페칭을 여기서 하지 마라. 이유: 화면 로직은 step 9.
- 기존 테스트를 깨뜨리지 마라.

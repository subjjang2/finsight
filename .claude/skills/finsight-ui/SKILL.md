---
name: finsight-ui
description: >-
  finsight의 UI·화면·컴포넌트를 만들거나 수정할 때 따라야 할 브랜드/디자인 기준.
  UI 작업, 컴포넌트 작성, 화면 디자인, 스타일링, Tailwind 클래스, 색/타이포/레이아웃,
  대시보드·차트·폼 구현, 유저 가이드 화면 설계 등 시각적 산출물을 만드는 모든 작업에서
  코드를 쓰기 전에 반드시 참조한다. 다크 + emerald 도구형 대시보드 톤을 강제하고
  AI-슬롭 안티패턴을 차단한다.
---

# finsight UI 가이드

finsight UI를 만들거나 고칠 때는 **코드를 쓰기 전에** 아래 정본과 예시를 먼저 확인한다.
새 색/토큰/패턴을 즉흥으로 만들지 말고, 기존 정본을 따른다.

## 1. 정본 (반드시 준수)
`docs/UI_GUIDE.md` — 색상·타이포·컴포넌트·레이아웃·상태·애니메이션 규칙과 AI-슬롭 안티패턴.
이 문서가 **시각 디자인** 결정의 단일 진실 소스다. 충돌 시 항상 이 규칙이 우선.

`docs/UX_GUIDE.md` — 유입·온보딩·단계 전환(퍼널) 정본. 화면 흐름, 단계별 전환 설계,
빈/에러 상태에서의 다음 행동, Pro 전환 시점을 정의한다. **화면을 새로 만들거나
사용자 흐름을 바꿀 때 반드시 참조**한다. (시각 규칙은 UI_GUIDE, 흐름 규칙은 UX_GUIDE)

> **유지보수**: 이 스킬은 위 정본 문서(`UI_GUIDE`·`UX_GUIDE`·`COMPONENTS.md`)를 *가리키기만* 한다.
> 토큰·규칙·흐름의 실제 값은 문서에만 둔다. 문서를 고쳤는데 이 스킬의 요약/참조가 어긋나면
> 같은 커밋에서 함께 갱신한다(둘을 다른 커밋으로 나누지 말 것 — drift의 원인).

핵심 요약:
- 다크모드 고정. 무채색(neutral) + 포인트 1색 **emerald(#10b981)**. 도구형 대시보드, 마케팅 톤 금지.
- 데이터가 주인공. 장식 최소화, 여백·정렬로 위계. 금액은 ₩ + `tabular-nums`, 날짜 `YYYY-MM-DD`.
- 모든 데이터 UI는 로딩/에러/빈/성공 4상태를 시각적으로 구분.
- 아이콘은 인라인 SVG, strokeWidth ~1.5–1.8, 둥근 배경 박스로 감싸지 않음.

## 2. 실제 토큰 출처
`docs/prototype/Finsight.html`의 `:root` 블록이 프로토타입에서 검증된 실제 토큰 값이다.
charcoal 다크 + emerald, Pretendard 한글 폰트. 토큰 변수명/값을 그대로 참고:
`--accent #10b981`, `--canvas #0a0b0d`, `--surface #121417`, `--surface-2/3`,
`--line`, `--ink #f3f5f6`, `--muted`, `--up #34d399`, `--down #f0716b`.

## 2b. 컴포넌트 카탈로그 (이미 존재 — 따르고 갱신)
`components/`에는 재사용 primitive가 이미 있고(`components/ui/index.tsx`의 Button·Card·Input·Stat 등,
`shell/`·`dashboard/`), `docs/COMPONENTS.md`가 그 카탈로그다. **새로 만들지 말고 이 카탈로그를
단일 진실 소스로 따른다.** 기존 컴포넌트가 있으면 재사용하고, 컴포넌트를 추가·변경하면
`docs/COMPONENTS.md`를 **같은 커밋에서** 갱신한다(props·변형(variant)·상태·사용 예).
(원칙·토큰=UI_GUIDE, 흐름=UX_GUIDE, **조립 단위=COMPONENTS.md**.)

## 3. 구현 예시 (그대로 패턴 차용)
- `docs/prototype/js/ui.jsx` — 공용 primitive: `Logo`, `Sidebar`, `PageHeader`, `Panel`,
  `Stat`, `HBar`, `Donut`, `VBars`, `emeraldScale`(카테고리 순차 색 스케일).
- `docs/prototype/js/screens.jsx` — `AuthScreen`, `UploadScreen`, `MappingScreen`, `AnalyzingScreen`.
- `docs/prototype/js/screens2.jsx` — `InsightsScreen`, `TrendScreen`, `PricingScreen`.
- `docs/prototype/screenshots/01-auth.png` — 렌더 결과 참고 이미지.
- 브라우저로 `docs/prototype/Finsight.html`을 열면 전체 화면을 직접 확인 가능.

프로토타입은 인라인 style 기반이지만, 실제 구현은 CLAUDE.md대로 Tailwind로 옮긴다.
색/간격/radius 값은 위 토큰과 UI_GUIDE.md에 매핑해 사용한다.

## 4. 참조 금지 (잔재)
`docs/prototype/_ds/coinbase-design-system-.../`는 클라우드 디자인 툴이 끼워넣은 **잔재**다.
흰 배경 + 파랑(#0052ff) + pill 형태의 Coinbase **마케팅** 시스템으로, finsight 브랜드와 정반대다.
`Finsight.html`이 `:root`에서 전부 다크/emerald로 덮어쓰므로 렌더링에만 필요하다.
**디자인 가이드/토큰 출처로 절대 읽지 말 것.** 토큰 정본은 `Finsight.html`의 `:root`다.

## 5. 금지 (AI-슬롭 안티패턴)
glass morphism(`backdrop-filter: blur`), gradient-text, 네온 글로우 box-shadow 애니메이션,
보라/인디고 브랜드색, 배경 gradient orb, "Powered by AI" 배지, 전부 동일 `rounded-2xl`.
상세는 `docs/UI_GUIDE.md`의 안티패턴 표.

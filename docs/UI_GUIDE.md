# UI 디자인 가이드

## 디자인 원칙
1. 도구처럼 보여야 한다. 마케팅 페이지가 아니라 매일 쓰는 대시보드.
2. 데이터가 주인공. 장식 최소화, 여백과 정렬로 위계를 만든다.
3. 다크모드 고정. 무채색 + 포인트 1색(emerald).
4. UI 카피는 한국어 단일. 금액은 원화(₩) 기준, 날짜는 `YYYY-MM-DD`.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| backdrop-filter: blur() | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text | AI SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 장식. 사용자 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드 동일 rounded-2xl | 템플릿 느낌 |
| 배경 gradient orb (blur-3xl) | AI 랜딩 장식 |

## 색상
> 정확한 토큰 hex는 `docs/prototype/Finsight.html`의 `:root`가 정본. 아래 값은 그와 일치한다.

### 배경
| 용도 | 값 | 토큰 |
|------|------|------|
| 페이지 | #0a0b0d | `--canvas` |
| 카드/패널 | #121417 | `--surface` |
| 보조 표면 | #16181c | `--surface-2` |
| 트랙/칩 | #22252b | `--surface-3` |
| 구분선 | #23262d | `--line` |

### 텍스트
| 용도 | 값 | 토큰 |
|------|------|------|
| 주 텍스트 | #f3f5f6 (≈text-white) | `--ink` |
| 보조 | #9aa0a8 (≈text-neutral-400) | `--muted` |
| 비활성 | #868b92 | `--muted-soft` |
| 강조 구분선 | #33373f | `--line-strong` |

### 데이터/시맨틱 색상
| 용도 | 값 | 토큰 |
|------|------|------|
| 포인트/성공 | #10b981 (emerald-500) | `--accent` |
| 증가(delta) | #34d399 | `--up` |
| 감소(delta)/부정 | #f0716b | `--down` |
| 에러 | #ef4444 | - |
| accent 글로우(미묘) | rgba(16,185,129,0.35) | `--accent-glow` |
| accent 흐린 배경 | rgba(16,185,129,0.12) | `--accent-dim` |

> `--accent-glow`/`--accent-dim`은 은은한 강조 배경·테두리용. "네온 글로우 애니메이션" 안티패턴과 다르다 — 정적 저채도로만 쓴다.

## 컴포넌트
> 시맨틱 토큰만 쓴다(임의 hex/neutral-* 금지). 실제 primitive는 `components/ui/index.tsx`가 정본.
### 카드
```
rounded-lg border border-line bg-surface p-6 text-ink
```
### 버튼
```
Primary: rounded-lg bg-white text-black hover:bg-neutral-200 px-4 py-2 text-sm font-medium
Accent:  rounded-lg bg-accent text-black hover:bg-accent/90 px-4 py-2 text-sm font-medium
Text:    text-muted hover:text-ink
```
### 입력 필드
```
rounded-lg bg-surface-2 border border-line focus:border-accent px-4 py-3 text-sm
```

## 레이아웃
- 전체 너비: 대시보드 max-w-6xl, 랜딩 max-w-5xl
- 정렬: 좌측 정렬 기본. 숫자/금액은 우측 정렬. 중앙 정렬은 빈/로딩 상태에만.
- 간격: gap-3~4, 섹션 간 space-y-8

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | text-4xl font-semibold text-white |
| 카드 제목 | text-sm font-medium text-neutral-400 |
| 본문 | text-sm text-neutral-300 leading-relaxed |
| 금액(강조) | text-2xl font-semibold tabular-nums |

- 금액·수치는 `tabular-nums`로 자릿수 정렬.

## 상태 (모든 데이터 UI 필수 4상태)
로딩 / 에러 / 빈(empty) / 성공. 각각 시각적으로 구분.

## 애니메이션
- fade-in (0.4s), slide-up (0.5s)만 허용. 그 외 금지.

## 아이콘
- SVG 인라인, strokeWidth 1.5. 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다.

## 참조 구현
- 이 가이드의 구체적 구현 예시는 `docs/prototype/`에 있다. 실제 토큰 값은 `docs/prototype/Finsight.html`의 `:root`, 컴포넌트 primitive는 `js/ui.jsx`, 화면은 `js/screens.jsx`·`screens2.jsx` 참조.
- 주의: `docs/prototype/_ds/coinbase-design-system-...`는 클라우드 툴 잔재(흰/파랑 마케팅 시스템)이며 finsight 브랜드와 무관 — 디자인 출처로 읽지 말 것.

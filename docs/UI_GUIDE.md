# UI 디자인 가이드

> 구현 기준은 인터랙티브 프로토타입 `docs/prototype/Finsight.html`. 토큰/색상이 충돌하면 프로토타입을 정본으로 본다.

## 기반
- 폰트: **Pretendard** (한국어 우선). 표시용 = 본문용 동일 스택, 숫자·금액은 `tabular-nums`.
- 디자인 시스템: **Coinbase Design System** 토큰 위에 다크+emerald 테마를 덧입힘.

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
### 배경 (charcoal 톤 — 프로토타입 정본)
| 용도 | 값 |
|------|------|
| 페이지(canvas) | #0a0b0d |
| 카드(surface) | #121417 |
| 표면 2 | #16181c |
| 표면 3 | #22252b |
| 경계선 | #23262d (강조 #33373f) |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트(ink) | #f3f5f6 |
| 보조(muted) | #9aa0a8 |
| 비활성(muted-soft) | #6b7177 |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 포인트/성공(accent) | #10b981 (emerald-500) |
| 상승(up) | #34d399 |
| 하락/에러(down) | #f0716b |

- 포인트는 emerald 단일이 정본. 프로토타입 Tweaks 패널의 teal/lime·slate 톤은 **탐색용 옵션**이며 프로덕션 기본 아님.

## 컴포넌트
### 카드
```
rounded-lg bg-[#121417] border border-[#23262d] p-6
```
### 버튼
```
Primary: rounded-lg bg-white text-black hover:bg-neutral-200 px-4 py-2 text-sm font-medium
Accent:  rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 px-4 py-2 text-sm font-medium
Text:    text-neutral-500 hover:text-neutral-300
```
### 입력 필드
```
rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm
```

## 레이아웃
- 전체 너비: 대시보드 본문 ~980px(max-w-5xl 수준, 좌측 사이드바 + 중앙 컬럼), 랜딩 max-w-5xl
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
- fade-in (0.4s), slide-up (0.5s), 로딩 스피너(spin) 허용. 그 외 금지.

## 아이콘
- SVG 인라인, strokeWidth 1.5. 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다.

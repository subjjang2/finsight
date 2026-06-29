# UI 디자인 가이드

## 디자인 원칙
1. 도구처럼 보여야 한다. 마케팅 페이지가 아니라 매일 쓰는 대시보드.
2. 데이터가 주인공. 장식 최소화, 여백과 정렬로 위계를 만든다.
3. 다크모드 고정. 무채색 + 포인트 1색(emerald).

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
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | #0a0a0a |
| 카드 | #141414 |

### 텍스트
| 용도 | 값 |
|------|------|
| 주 텍스트 | text-white |
| 본문 | text-neutral-300 |
| 보조 | text-neutral-400 |
| 비활성 | text-neutral-500 |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 포인트/성공 | #10b981 (emerald-500) |
| 부정/에러 | #ef4444 |
| 중립/기본 | #525252 |

## 컴포넌트
### 카드
```
rounded-lg bg-[#141414] border border-neutral-800 p-6
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
- 전체 너비: max-w-5xl
- 정렬: 좌측 정렬 기본. 중앙 정렬은 빈/로딩 상태에만.
- 간격: gap-3~4, 섹션 간 space-y-8

## 타이포그래피
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | text-4xl font-semibold text-white |
| 카드 제목 | text-sm font-medium text-neutral-400 |
| 본문 | text-sm text-neutral-300 leading-relaxed |

## 상태 (모든 데이터 UI 필수 4상태)
로딩 / 에러 / 빈(empty) / 성공. 각각 시각적으로 구분.

## 애니메이션
- fade-in (0.4s), slide-up (0.5s)만 허용. 그 외 금지.

## 아이콘
- SVG 인라인, strokeWidth 1.5. 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다.

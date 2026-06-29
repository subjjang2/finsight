# Step 4: csv-parsing

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ADR.md` (ADR-007 CSV는 AI 자동 컬럼 매핑 — 파싱은 raw 추출까지만, 매핑은 Claude 담당)
- `/docs/PRD.md` (핵심 기능 1: 헤더/날짜형식/인코딩 제각각)
- `/docs/prototype/js/data.jsx` (`RAW_CSV` — EUC-KR, 헤더 `['이용일자','가맹점','이용금액(원)',...]`, 금액 `'6,300'`, 날짜 `'2026.05.02'`)
- step 1 산출물: `types/tier.ts`(MAX_ROWS_PER_UPLOAD=1000), `types/mapping.ts`, `types/transaction.ts`
- step 0 산출물: 테스트 러너 설정

## 작업

`lib/csv/`에 순수 CSV 파싱·검증 유틸을 만든다. **컬럼 의미 추론(date/merchant 매핑)은 하지 않는다 — 그건 Claude(step 5) 담당.** 이 step은 바이트→행렬 변환과 값 정규화만.

1. **`lib/csv/decode.ts`** — 인코딩 디코딩. `decodeBuffer(buf: Uint8Array): string`.
   - UTF-8과 **EUC-KR 모두** 지원(샘플이 EUC-KR). BOM 처리. 한국어 카드사 명세서가 깨지지 않아야 한다.
   - 가벼운 인코딩 감지 또는 EUC-KR 우선 시도 후 폴백. (필요 시 `iconv-lite` 의존성 추가 허용)
2. **`lib/csv/parse.ts`** — `parseCsv(text: string): { headers: string[]; rows: string[][] }`.
   - 따옴표 안 콤마, 따옴표 이스케이프, CRLF/LF 처리. (검증된 경량 파서 사용 또는 직접 구현)
   - `MAX_ROWS_PER_UPLOAD`(1000) 초과 시 에러를 throw 한다. 이유: 행 상한.
3. **`lib/csv/normalize.ts`** — 확정된 매핑이 주어졌을 때 정규화:
   - `normalizeAmount(s: string): number` — `'6,300'`·`'₩6,300'`·`'6,300원'` → `6300`. 음수/환불 표기 처리. 숫자 불가 시 에러.
   - `normalizeDate(s: string): string` — `'2026.05.02'`·`'2026-05-02'`·`'2026/05/02'` → `'YYYY-MM-DD'`. 파싱 불가 시 에러.
   - `extractSample(rows, colIndex, n)` — 매핑용 샘플 추출 헬퍼.

서명 예:
```ts
export function parseCsv(text: string): { headers: string[]; rows: string[][] }
export function normalizeAmount(raw: string): number
export function normalizeDate(raw: string): string
```

**TDD: 테스트를 먼저 작성하라.** 최소: EUC-KR 디코딩 라운드트립, 콤마 포함 금액, 다양한 날짜형식, 1000행 초과 에러, 따옴표 필드 파싱. 테스트 픽스처는 `data.jsx`의 `RAW_CSV` 샘플 값을 활용한다.

## Acceptance Criteria

```bash
npm test        # csv 파싱·디코딩·정규화 테스트 통과
npm run build   # 타입 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - `lib/csv/`에 위치, 순수 함수(외부 API/DB 호출 없음) (ARCHITECTURE 디렉토리 규칙)
   - EUC-KR 한국어 디코딩 정상
   - 1000행 초과 시 명확한 에러 (행 상한)
   - 컬럼 의미 추론을 하지 않음 — 그건 Claude 담당 (ADR-007)
3. 결과에 따라 `phases/0-mvp/index.json`의 step 4를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "lib/csv decode/parse/normalize + 테스트 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- 여기서 컬럼 의미(어느 컬럼이 날짜/가맹점/금액인지)를 휴리스틱으로 추론하지 마라. 이유: ADR-007이 이를 Claude 매핑 + 사용자 확인으로 위임한다. 휴리스틱은 설계 위반.
- 1000행 상한을 무시하고 무제한 파싱하지 마라. 이유: 토큰비용·UX 상한.
- 이 step에서 Supabase/Anthropic을 호출하지 마라. 이유: 순수 lib 레이어 유지.
- 기존 테스트를 깨뜨리지 마라.

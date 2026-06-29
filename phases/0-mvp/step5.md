# Step 5: claude-service

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ADR.md` (ADR-005 `claude-sonnet-4-6` + structured output, 1회 호출 실패 시 503, ADR-007 매핑, ADR-008 enum)
- `/docs/PRD.md` (카테고리 12개, MVP 제외: 재시도·백오프·회로차단 없음)
- `/AGENTS.md` (CRITICAL: Claude 호출은 서버 전용, ANTHROPIC_API_KEY 서버 전용)
- step 1 산출물: `types/category.ts`(Category), `types/mapping.ts`(ColumnMapping, MappingField), `lib/categories.ts`(CATEGORY_IDS)
- step 4 산출물: `lib/csv/`(parse 결과 형태)

추가 참고: Anthropic SDK / 모델 ID / structured output 사용법은 `claude-api` 스킬을 참조하라(메모리에서 추측하지 말 것). 모델 ID는 ADR-005가 지정한 `claude-sonnet-4-6`.

## 작업

`services/claude.ts`에 Claude 호출 래퍼 2개를 만든다. **반드시 서버 전용** — `import 'server-only'` 상단 선언. `ANTHROPIC_API_KEY`로 SDK 클라이언트를 **함수 내부 lazy 생성**.

1. **`mapColumns(headers: string[], sampleRows: string[][]): Promise<ColumnMapping[]>`**
   - 헤더 + 샘플 몇 행을 Claude에 넘겨 각 원본 컬럼을 `date|merchant|amount|ignore`로 매핑.
   - structured output(JSON schema)로 `ColumnMapping[]` 형태를 강제. confidence 포함.
   - 결과는 사용자 확인 단계로 전달됨(이 함수는 분류까지 하지 않는다 — 2콜 분리, ADR-007).

2. **`classifyTransactions(txs: { date: string; merchant: string; amount: number }[]): Promise<{ category: Category }[]>`**
   - 각 거래를 **고정 12개 enum**으로만 분류. structured output schema의 `category` 필드를 `CATEGORY_IDS` enum으로 제약한다.
   - enum 밖 값이 오면 `'etc'`로 폴백(ADR-008). 입력과 출력 길이·순서 일치 보장.
   - (선택) 분류 결과 기반 서술형 1~2문장 요약 생성 함수 `summarize(insight)`를 같은 모듈에 둘 수 있다. 단 이상거래 탐지·절약 제안은 MVP 제외.

**핵심 규칙(반드시 준수)**:
- 모델 ID는 `claude-sonnet-4-6` (ADR-005).
- **재시도·백오프·회로차단 금지** — 1회 호출, 실패 시 호출자에게 에러를 던진다(라우트가 503 변환, ADR-005). 이 step에서 try/retry 루프를 만들지 마라.
- 출력은 structured output(JSON schema)로 강제해 파싱 안정화.
- 카테고리 enum을 schema 레벨에서 제약 — AI가 임의 카테고리 생성 불가(AGENTS.md CRITICAL).

**TDD: 테스트를 먼저 작성하라.** Anthropic SDK를 **모킹**해서:
- `mapColumns`가 모킹 응답을 `ColumnMapping[]`로 반환하는지
- `classifyTransactions`가 enum 밖 응답을 `'etc'`로 폴백하는지
- 실패(모킹 throw) 시 재시도 없이 즉시 에러를 전파하는지
**실제 API를 호출하는 테스트는 금지**(유료 호출). 모킹만.

## Acceptance Criteria

```bash
npm test        # 모킹 기반 claude 서비스 테스트 통과 (실제 API 호출 없음)
npm run build   # 타입 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다(실제 ANTHROPIC_API_KEY 불필요 — 모킹).
2. 아키텍처 체크리스트:
   - `import 'server-only'` 존재, 클라 번들에 키 미노출 (AGENTS.md CRITICAL)
   - 모델 ID `claude-sonnet-4-6` (ADR-005)
   - structured output schema에 category enum 12개 제약 (ADR-008, AGENTS.md)
   - 재시도/백오프 루프 없음 (ADR-005, MVP 제외)
   - 매핑·분류가 별도 함수(2콜) (ADR-007)
3. 결과에 따라 `phases/0-mvp/index.json`의 step 5를 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "services/claude mapColumns/classify + 모킹 테스트 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- 테스트나 검증에서 실제 Anthropic API를 호출하지 마라. 이유: 유료 호출(AGENTS.md, 사용자 사전 확인 규칙). 모킹만 사용.
- 재시도·백오프·회로차단을 구현하지 마라. 이유: MVP 제외(PRD), 1회 호출 후 503(ADR-005).
- category schema를 자유 문자열로 두지 마라. 이유: AI 임의 카테고리 생성 차단(AGENTS.md CRITICAL, ADR-008).
- 클라이언트 컴포넌트에서 import 가능하게 만들지 마라. 이유: API 키 노출.
- 기존 테스트를 깨뜨리지 마라.

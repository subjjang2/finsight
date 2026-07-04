export const meta = {
  name: 'review-code',
  description: '차원별 전문 서브에이전트가 diff를 병렬 리뷰하고, 각 finding을 적대적으로 검증해 confirmed만 남긴다',
  phases: [
    { title: 'Review', detail: 'correctness · security · architecture 3차원 병렬 리뷰' },
    { title: 'Verify', detail: 'finding별 반증 시도 — 살아남은 것만 confirmed' },
  ],
}

// args = { diff: string, guardrails: string, range: string }
// 없는 인자는 방어적으로 처리 (diff 없으면 에이전트가 직접 git diff 실행)
const diff = (args && args.diff) || ''
const guardrails = (args && args.guardrails) || '(가드레일 미제공 — 저장소의 CLAUDE.md를 직접 읽어라)'
const range = (args && args.range) || '워킹트리 + staged'

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          file: { type: 'string', description: '저장소 상대 경로' },
          line: { type: 'integer', description: '1-indexed 라인. 범위면 시작 라인' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit'] },
          dimension: { type: 'string' },
          title: { type: 'string', description: '한 줄 제목' },
          tldr: { type: 'string', description: '무엇이 왜 문제인가 한 줄' },
          why: { type: 'string', description: '근거·터지는 시나리오 (구체적 입력/상태 → 잘못된 결과)' },
          fix: { type: 'string', description: '수정 방향 또는 코드 스니펫' },
        },
        required: ['file', 'line', 'severity', 'dimension', 'title', 'tldr', 'why', 'fix'],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isReal: { type: 'boolean', description: '반증 시도 후에도 실제 결함이면 true. 불확실하면 false' },
    reason: { type: 'string', description: '반증/확정 근거 한두 줄' },
  },
  required: ['isReal', 'reason'],
}

const SEVERITY_RUBRIC = `심각도 4단계 (Harness 정의):
- critical: 배포 차단. 보안/PII 유출, 데이터 손상, CLAUDE.md CRITICAL 규칙 위반
- major: 병합 전 수정. 명백한 버그, 아키텍처 위반
- minor: 개선 권장. 사소한 버그·리스크
- nit: 취향/스타일. 무시 가능`

const DIMENSIONS = [
  {
    key: 'correctness',
    focus: `**Correctness** — 로직 버그, 잘못된 조건/경계, null·undefined·빈배열 처리 누락,
비동기/에러 처리, 상태 갱신 오류, off-by-one, 타입 불일치로 인한 런타임 실패.
각 finding은 "이 입력/상태 → 이 잘못된 결과"로 재현 시나리오를 반드시 명시하라.`,
  },
  {
    key: 'security',
    focus: `**Security + Privacy** — 이 프로젝트는 금융 PII SaaS다. 특히:
- 비밀 키가 클라이언트 번들/NEXT_PUBLIC_로 노출되는가 (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, POLAR_*는 서버 전용)
- 금융 PII 테이블(transactions 등)에 RLS 없이 접근하거나 RLS 없는 PII 테이블을 만드는가
- app/api/ 라우트 또는 서버 전용 모듈 밖에서 service-role / 외부 API를 호출하는가
- 인증/인가 우회, 소유자 아닌 행 접근, 입력 검증 누락, 시크릿 로깅
PII·시크릿 관련은 대부분 critical/major다.`,
  },
  {
    key: 'architecture',
    focus: `**Architecture + Conventions** — 프로젝트 가드레일 준수:
- 디렉터리 분리: 컴포넌트 components/, 타입 types/, 외부 API 래퍼 services/, 유틸 lib/
- 거래 분류가 고정 카테고리 enum(10~12개)만 쓰는가 (AI 임의 카테고리 생성 금지)
- 매핑 확인 단계 없이 업로드 시 자동 분석하는 UX 흐름을 깨지 않는가
- TDD: 새 route 핸들러/기능에 테스트가 선행하는가 (route.test.ts 또는 lib/services로 추출)
- 이중 가드레일(CLAUDE.md/AGENTS.md) 및 docs/*.md 정본과의 정합성`,
  },
]

function reviewPrompt(d) {
  return `너는 코드 리뷰 전문가다. 아래 diff를 **오직 다음 차원으로만** 검토하라.

${d.focus}

## 프로젝트 가드레일 (위반은 심각도를 높인다)
${guardrails}

${SEVERITY_RUBRIC}

## 리뷰 대상 diff (범위: ${range})
\`\`\`diff
${diff}
\`\`\`

## 지시
- diff에 실제로 존재하는 문제만 보고하라. 추측·일반론·"할 수도 있다" 금지.
- 맥락이 필요하면 저장소의 해당 파일을 직접 Read로 열어 확인하라 (예: RLS 존재 여부, import 경로).
- 차원에 해당하지 않는 문제는 다른 에이전트가 본다 — 네 차원만 보고하라.
- 문제가 없으면 findings를 빈 배열로 반환하라. 없는 문제를 만들지 마라.
- 각 finding에 file, line, severity, title, tldr, why(재현 시나리오), fix를 채워라.
- dimension 필드는 "${d.key}"로 고정하라.`
}

function verifyPrompt(f) {
  return `다른 리뷰어가 아래 결함을 보고했다. 너의 임무는 이것을 **반증하는 것**이다.

## 보고된 결함
- 파일: ${f.file}:${f.line}
- 차원: ${f.dimension} / 심각도: ${f.severity}
- 제목: ${f.title}
- 주장: ${f.tldr}
- 근거: ${f.why}

## 리뷰 대상 diff
\`\`\`diff
${diff}
\`\`\`

## 지시
- 이 주장이 틀렸을 가능성을 적극적으로 찾아라: 실제로는 안전한가? 다른 코드가 이미 방어하는가?
  주장이 diff를 오독했는가? 실제로 트리거 불가능한 경로인가?
- 필요하면 저장소 파일을 Read로 열어 확인하라 (주장이 참조하는 방어 로직이 실제로 있는지 등).
- 반증에 실패했을 때만(= 실제 결함이 맞을 때만) isReal=true. **불확실하면 isReal=false.**
- reason에 반증/확정 근거를 한두 줄로 적어라.`
}

phase('Review')
log(`${DIMENSIONS.length}개 차원 병렬 리뷰 시작 (범위: ${range})`)

const perDimension = await pipeline(
  DIMENSIONS,
  (d) =>
    agent(reviewPrompt(d), { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA })
      .catch(() => ({ findings: [] })), // 한 차원 실패가 그 차원 리뷰를 통째로 죽이지 않게 — verify 경로와 대칭

  (review, d) => {
    const findings = (review && review.findings) || []
    if (!findings.length) return []
    return parallel(
      findings.map((f) => () =>
        agent(verifyPrompt(f), { label: `verify:${d.key}:${f.file}`, phase: 'Verify', schema: VERDICT_SCHEMA })
          .then((v) => ({ ...f, verdict: v }))
          .catch(() => ({ ...f, verdict: { isReal: false, reason: 'verify 실패 — 보수적으로 탈락' } }))
      )
    )
  }
)

const all = perDimension.flat().filter(Boolean)
const confirmed = all.filter((f) => f.verdict && f.verdict.isReal)
const rejected = all.length - confirmed.length

log(`검증 완료: ${all.length}건 중 confirmed ${confirmed.length}, 반증 탈락 ${rejected}`)

// 심각도순 정렬 후 반환 — 리포트 포맷은 스킬(메인 루프)이 담당
const RANK = { critical: 0, major: 1, minor: 2, nit: 3 }
confirmed.sort((a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9))

return { confirmed, counts: {
  critical: confirmed.filter((f) => f.severity === 'critical').length,
  major: confirmed.filter((f) => f.severity === 'major').length,
  minor: confirmed.filter((f) => f.severity === 'minor').length,
  nit: confirmed.filter((f) => f.severity === 'nit').length,
}, rejected }

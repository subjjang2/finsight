---
name: review-code
description: >-
  변경된 코드(diff)를 correctness · security+privacy · architecture 3개 차원의 전문
  서브에이전트가 병렬로 리뷰하고, 각 finding을 적대적으로 검증(verify)해 false positive를
  걸러낸 뒤 심각도별 리포트를 낸다. "코드 리뷰해줘", "변경 리뷰", "diff 리뷰", "PR 리뷰",
  "review-code", "차원별 리뷰", "병렬 리뷰", "이 변경 검토해줘" 같은 요청에서 이 스킬을 쓴다.
  단일 에이전트로 대충 훑지 말고 차원별 전문성 + 병렬 속도 + 적대적 검증으로 리뷰한다.
---

# review-code — 차원별 병렬 코드 리뷰 (Workflow 기반)

같은 diff를 **차원별 전문 서브에이전트가 동시에** 보고, 각 지적을 **반증 시도로 검증**해
살아남은 것만 리포트한다. 오케스트레이션은 `.claude/workflows/review-code.mjs` Workflow가 담당한다.

- **왜 병렬 fan-out**: 차원별 전문성(한 렌즈에 집중) + 동시 실행 속도(벽시계 = 가장 느린 한 차원)
- **왜 verify**: 리뷰 에이전트의 그럴듯하지만 틀린 지적(false positive)을 적대적으로 걸러낸다

## 0. 비용 가드 (실행 전 필수)

이 스킬은 서브에이전트를 여러 개 fan-out 하므로 토큰을 여러 배 쓴다.
**Workflow를 호출하기 전에** 사용자에게 알린다:
- 예상 에이전트 수 = 리뷰 3(차원) + verify N(리뷰가 낸 finding 수, 실행마다 가변)
- 대략 "3개 리뷰 + finding당 1개 검증 에이전트"

사용자가 명시적으로 승인하면 진행한다. (전역 규칙: 유료 API 대량 호출 사전 확인)

## 1. diff 수집

기본 범위는 **워킹트리 + staged**. 인자로 override 가능:
- 기본: `git diff HEAD` + `git diff --cached` (또는 `git diff HEAD`로 통합)
- 브랜치 전체: 사용자가 지시하면 `git diff main...HEAD`
- 특정 PR: 사용자가 PR 번호를 주면 `gh pr diff <n>`

```bash
git --no-pager diff HEAD          # 워킹트리+staged 통합 (기본)
```
diff가 비어 있으면 "리뷰할 변경 없음"을 알리고 종료한다.

## 2. 가드레일 준비

리뷰 에이전트가 프로젝트 특화 검사를 하도록 **CLAUDE.md의 CRITICAL 규칙과 아키텍처 규칙을
발췌**해 전달한다. (비밀키 서버 전용, PII 테이블 RLS 강제, 외부 API는 app/api/·서버 모듈에서만,
고정 카테고리 enum, 매핑 확인 없는 자동분석 UX, TDD/route.test 게이트, 이중 가드레일.)

## 3. Workflow 호출

```
Workflow({
  name: 'review-code',
  args: { diff: <1에서 캡처한 diff>, guardrails: <2의 발췌>, range: '워킹트리+staged' }
})
```
Workflow는 `{ confirmed: [...], counts: {critical,major,minor,nit}, rejected: N }`을 반환한다.
`confirmed`는 이미 심각도순 정렬돼 있고, 각 항목은 `{file,line,severity,dimension,title,tldr,why,fix}`.

## 4. 리포트 출력 (터미널 마크다운, 코드 수정 안 함)

Workflow 결과를 아래 **2층 포맷**으로 출력한다. 실제 PR엔 붙이지 않는다.

### ① 인라인 코멘트 (confirmed finding마다, 라인별 4줄)
```
`path/to/file.ts:42` — [major] 제목
TL;DR: 무엇이 왜 문제
Why: 근거·터지는 시나리오
→ Fix: 수정 코드/방향
```
심각도순으로 나열한다. (인라인엔 칭찬을 넣지 않는다 — 문제 지적 전용.)

### ② PR 전체 요약 (맨 위 1개)
**판정+집계는 맨 위 인용구(`>`) 한 줄로 올려 한눈에 보이게 한다** (GitHub·터미널 공통):
```
> 판정: **Blocked / Changes Requested / Approve** · 🔴 N · 🟠 N · 🟡 N · ⚪ N  (verify 탈락 R건 제외)

Walkthrough: 이 변경이 무엇을 하는지 2~3줄
잘된 점: 이 diff에서 잘 된 부분 (요약에만 존재)
주요 이슈: critical·major만 나열 (minor/nit는 인라인 참고)
다음 액션: 우선 무엇부터 고쳐야 하는지
```

**판정 자동 매핑** (집계에서 기계적으로 도출 — 에이전트 재량 금지):
- critical ≥ 1 → **Blocked**
- major ≥ 1 → **Changes Requested**
- 그 외 → **Approve**

## CI 모드 (GitHub Actions) — 현재는 경량 lite 리뷰

CI(`.github/workflows/ai-review.yml`)는 **위 3차원 Workflow를 돌리지 않는다.** `claude-code-action`은
OIDC 강제로 App 미설치 환경에서 실패해 **미사용**이고, 대신 headless `claude -p`가 **Haiku 단일 패스
lite 리뷰**를 돈다(서브에이전트·이 Workflow 명시적 금지, `--allowedTools "Bash Read Grep Glob"`).
이 SKILL의 3차원 fan-out/verify는 **정식 파이프라인이며 CI의 lite 리뷰가 나중에 교체될 대상**이다
(워크플로가 코멘트 배너에도 "정식 3차원 리뷰가 아님(추후 교체)"이라 명시). CI 실제 동작:

- **트리거·비용 게이팅**: PR `opened`/`ready_for_review`(첫 자동 1회) 또는 `labeled`(`ai-review`)·
  `@claude` 멘션(write 권한자). `synchronize`(커밋 push)는 자동 재실행 안 함. draft·fork 제외.
- **인증**: `secrets.GITHUB_TOKEN`을 `GH_TOKEN`으로 주입(`gh` CLI). 모델은 `claude-haiku-4-5`.
- **출력은 요약 코멘트 1개**: `gh pr comment`로 배너 + 3~6줄 요약 하나만 남긴다. **인라인 per-finding
  코멘트는 달지 않는다**(`gh api .../comments`·`classify_inline_comments` 미사용). 각 항목 앞에
  `[critical]/[major]/[minor]/[nit]` 태그.
- **심각도 집계는 `ai-review-verdict.json`**: `{"critical":N,"major":N,"minor":N,"nit":N}` 한 줄을
  워크스페이스 루트에 쓴다(마지막 필수 산출물).
- **자동 처리는 결정적 bash 게이트**(AI 아님): verdict.json을 읽어 critical/major≥1→차단(`ai-blocked`),
  minor만→approve만(`ai-approved`), nit-only/clean→approve + **결정적 머지 가드(신뢰 작성자·타 체크
  통과·diff≤10파일/200줄) 모두 통과 시에만** squash merge. **fail-safe: verdict 누락/파싱 실패 시
  approve·merge 안 함**(프롬프트 인젝션 완화).

## 확장 (10차원)

`.claude/workflows/review-code.mjs`의 `DIMENSIONS` 배열에 항목을 추가하면 차원이 늘어난다.
후보 7개: performance, conventions, test-coverage, cross-file-consistency, cpu/perf-patterns,
behavioral-correctness, (그리고 privacy를 security에서 분리). 파이프라인·스키마·리포트 로직은 불변.

## 주의

- 리포트 **전용**이다. 코드를 수정하지 않는다 (수정이 필요하면 사용자가 별도 지시).
- verify를 통과한 finding만 집계·판정에 반영한다. 반증 탈락 건수는 집계 줄에 R로만 표기.
- diff가 없으면 실행하지 않는다. 비용 가드(0)를 건너뛰지 않는다.

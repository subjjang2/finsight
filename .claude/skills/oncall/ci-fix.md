# ci-fix — CI 실패 수정 런북

[SKILL.md](SKILL.md)의 불변 원칙을 전제로, 아래 순서를 따른다. 코드 지도는 [service-map.md](service-map.md).

## 실행 모드에 따른 역할 분담 (중요)
oncall은 두 모드로 돈다.
- **헤드리스 CI(`oncall-ci-fix.yml`)** — 보안상 **권한 분리**. 에이전트인 너는 **파일 편집만**
  한다(Read/Edit/Write/Grep/Glob, 셸·git·gh 없음): 근본원인 분석(1·2) → 소스 수정(3) →
  `oncall-report.md` 작성. 브랜치 생성·`npm run` 검증·PR 생성(4·5)은 **이후 워크플로우 스텝이
  자동 처리**한다. 너는 git/gh/npm 을 시도하지 마라(도구가 없다).
- **인터랙티브 터미널** — 사람이 붙어 있으면 아래 4·5의 git/PR 단계까지 네가 직접 수행할 수 있다.

## 1. 실패 로그 수집
- `gh run view <run_id> --log-failed` 로 **실패 잡 로그만** 읽는다(성공 잡은 노이즈).
- 워크플로우 실행 시엔 이미 워크스페이스 루트 `oncall-failing.log` 에 수집돼 있다 — 그걸 Read.
- 로그에서 첫 실패 신호(에러 스택·assertion diff·eslint rule·tsc 코드 `TSxxxx`)를 찾아 인용.

## 2. 근본 원인 분석
- 흔한 유형: **타입 에러**(tsc/next build), **누락 import**, **테스트 미스매치**(스냅샷·기대값),
  **lint 위반**(eslint rule), **깨진 참조**(리네임 누락).
- "증상"이 아니라 "원인"을 특정한다. 로그의 파일:라인 → 소스를 Read 로 확인, 필요하면
  [service-map.md](service-map.md)로 변경 영향 경계를 판단.
- **금지**: `CLAUDE.md` CRITICAL 규칙을 위반하는 수정. 실패 테스트를 삭제/skip/약화해서 통과시키지 마라.

## 3. 패치 (에이전트가 하는 마지막 단계 — 헤드리스 CI)
- 근본원인을 고치는 **최소 외과적 수정**만 Edit/Write 로 소스에 적용한다.
- main/원본에 직접 손대는 개념이 아니다 — 워크플로우가 `oncall/fix-<run_id>` 새 브랜치에 담는다.
- 그리고 `oncall-report.md` 를 Write 한다:
  - 첫 줄 `STATUS: FIXED` 또는 `STATUS: DIAGNOSIS_ONLY`(확신 있는 수정 실패 시).
  - `## 무엇이 깨졌나` — 근본원인 요약(파일·규칙·에러 유형).
  - `## 어떻게 고쳤나` — 변경 요약(진단만이면 왜 자동수정이 어려운지).
  - 금지: 로그 원문·env·시크릿 값 붙여넣기. 사람이 읽을 요약만.

## 4. 검증 (워크플로우가 자동 — 헤드리스 CI)
- 워크플로우가 시크릿 없는 환경에서 `npm run lint/build/test` 로 green 인지 확인한다.
- green 아니면 5의 PR을 `--draft`로 연다.

## 5. PR 생성 (워크플로우가 자동 — 헤드리스 CI)
- `oncall/fix-<run_id>` 브랜치를 push 하고 `gh pr create --base <실패 브랜치>` 로 PR을 연다.
  본문은 네가 쓴 `oncall-report.md`. green 아니거나 코드 변경 없으면 `--draft`.
- **자동 머지 없음(`gh pr merge` 안 함).** 사람이 리뷰·머지한다(사람 게이트).

(인터랙티브 터미널 모드라면 3~5의 git/gh 단계를 네가 직접 수행하되, 위 규칙을 동일하게 지킨다.)

---
name: ship
description: >-
  변경사항을 안전하게 합치고 내보낸다 — (필요 시) merge/conflict 해결 → build → test →
  lint 검증 → commit → 푸시 전 확인. "커밋하고 푸시", "merge하고 테스트하고 올려",
  "검증하고 배포", "conflict 풀고 합쳐줘", "ship", "출시 준비", "내보내줘" 같은 요청에서
  이 스킬을 쓴다. 매번 같은 검증·합치기 순서를 풀어서 지시하지 말고 이 스킬로 묶는다.
---

# ship — 검증 후 안전하게 내보내기

매번 손으로 지시하던 "merge·conflict 해결·빌드·테스트·lint·커밋·푸시"를 한 절차로 묶는다.
**검증은 자동, 외부로 나가는 행위(push)는 항상 사용자 확인 후.**

## 0. 사전 점검

- `git status`로 현재 브랜치·변경 파일을 확인하고 사용자에게 보여준다.
- main에서 직접 작업 중이면 먼저 작업 브랜치를 권한다(프로젝트 규약).

## 1. (요청 시) merge / conflict 해결

- 사용자가 merge를 요청했을 때만 수행한다.
- conflict가 나면 각 충돌을 **양쪽 의도를 보존하는 방향**으로 해결하고, 무엇을 어떻게
  합쳤는지 파일별로 한 줄씩 보고한다. 애매하면 추측하지 말고 사용자에게 묻는다.

## 2. 검증 (실패하면 여기서 멈춤)

순서대로 돌리고, 하나라도 실패하면 **푸시하지 않고** 원인과 로그를 보고한다.

```bash
npm run build    # output: standalone 프로덕션 빌드
npm test         # Vitest
npm run lint     # ESLint
```

- TDD 규약: 새 기능이면 테스트가 먼저 있어야 한다. 단 `scripts/hooks/tdd-guard.sh`는 여기(npm 검증)가
  아니라 **편집 시점의 PreToolUse 훅**(`.claude/settings.json`)으로 동작해 테스트 없는 route 핸들러
  Edit/Write를 **미리 차단**한다. 즉 검증 이전 단계에서 막히니, 편집이 거부되면 테스트부터 붙인다.

## 3. commit

- conventional commits 형식(`feat: / fix: / docs: / refactor: / chore:`).
- 사용자가 메시지를 주면 그대로, 아니면 변경 내용으로 한 줄 제안 후 진행.
- 변경 범위가 섞여 있으면 논리 단위로 나눠 커밋할지 제안한다.
- git `pre-commit` 훅(`.githooks/pre-commit`, `package.json`의 `prepare`가 hooksPath 설정)이
  staged `.ts/.tsx`에 `eslint` + `vitest related`를 돌린다. 커밋이 훅에서 실패하면 그 이유부터 고친다.

## 4. push — 항상 확인 후

- 푸시 대상(`origin/<branch>`)과 커밋 요약을 보여주고 **명시적 승인**을 받은 뒤 push.
- force push는 사용자가 명시적으로 요청한 경우에만, 위험을 알린 뒤 수행.

## 주의

- 빌드/테스트/lint 중 하나라도 깨진 상태로는 push를 제안하지 않는다.
- 푸시는 되돌리기 어려운 외부 행위다 — 승인 없이 진행하지 않는다.

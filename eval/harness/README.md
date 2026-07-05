# harness eval

finsight의 **비즈니스 로직이 아니라 하네스(harness) 품질**을 측정하는 회귀 게이트.
"우리 가드레일(CLAUDE.md)이 실제로 룰 위반을 잡고, 라이브 CLAUDE.md가 코드베이스
질문에 정확히 답하게 하는가"를 golden set으로 고정한다.

## 두 트랙

| 트랙 | subject | 측정 | 채점(judge) |
| --- | --- | --- | --- |
| **review** | 경량 리뷰어 — sonnet, temp 0, 시스템 프롬프트 = CLAUDE.md CRITICAL 룰 요약 | 코드 스니펫의 룰 위반을 잡는가 | opus가 리뷰어 결론이 정답 라벨(`violation`/`pass`)과 맞는지 판정 |
| **qa** | 응답자 — sonnet, 라이브 `CLAUDE.md`를 컨텍스트로 주입 | 규약·예외처리·gotcha 질문에 사실로 답하는가 | opus가 답변이 `must` 사실을 모두 담고 `must_not`을 말하지 않는지 판정 |

subject는 sonnet, judge는 **다른 모델(opus)** 이다 — 자기 채점 편향을 피한다.

### review 트랙 균형 (위반 4 + 오탐 방지 1)
위반을 잡는 것만큼 **정상 코드를 오탐하지 않는 것**이 품질이다. 그래서 셋에는
컴플라이언트하지만 의심스러워 보이는 케이스(`expect: pass`)를 최소 1개 박아
false positive를 막는다. 예: `review-05` — `import "server-only"` 모듈이
정당하게 service-role 키를 쓰는 코드(오탐하면 실패).

### qa 트랙 가드 (틀린 전제 반박 1)
`false_premise: true` 케이스는 질문 자체에 틀린 전제를 심는다. 응답자는 답하기 전에
전제를 **명시적으로 반박**해야 통과한다. 예: `qa-02` — "로그인 유저가 자기 tier를
바로 pro로 update하면 되지?" (DB 트리거가 막고 webhook/service-role만 바꿀 수 있음).

## 두 실행 트랙: `npm test` vs `npm run eval`

파싱·집계는 순수 함수로 분리(`lib/parse.ts`, `lib/aggregate.ts`)해 **키·네트워크 없이**
검증하고, 비용이 드는 라이브 채점만 따로 뗀다.

```bash
npm test        # 키 없음. 파서/집계/골든셋 무결성·균형만 검사 (lib/*.test.ts)
npm run eval    # 라이브. Claude API 호출(과금) → subject 실행 + opus judge 채점
```

- `npm test`는 CI 유닛 테스트에 그대로 포함되어도 네트워크를 타지 않는다.
  `balance.test.ts`가 "위반 4+ / 정상 1+ / 틀린 전제 1+" 균형과 id 유일성,
  빈 본문 없음 등 셋의 **모양**을 지킨다.
- `npm run eval`은 **회귀 게이트**다. 하나라도 실패하면 `process.exitCode = 1`.
  결과 리포트를 콘솔에 출력하고 `reports/last-run.html` + `reports/last-run.json`으로 저장한다.

> ⚠️ `npm run eval`은 유료 Claude API를 호출한다. 케이스 9개 × (subject + judge) ≈
> 18회 호출. 실행 전 비용을 확인할 것.

## 골든셋 원칙

- **작게 시작한다.** 지금은 review 5 + qa 4 = 9 케이스. 커버리지보다 신호가 중요하다.
- **라벨은 사람이 박제한다.** `case/*.md`의 frontmatter 라벨(`expect`, `must`,
  `must_not`, `false_premise`)은 사람이 손으로 정하는 ground truth다. 모델이 라벨을
  만들지 않는다. 룰이 바뀌면 케이스와 라벨을 사람이 갱신한다.
- **한 케이스 = 한 파일.** frontmatter가 라벨, 본문이 subject 입력(코드 스니펫 또는 질문).

## 케이스 형식

review:
```markdown
---
track: review
id: review-01-service-role-in-client
expect: violation        # violation | pass
rule: A2                 # 추적용 룰 라벨
title: ...
---
<코드 스니펫 = 리뷰 대상>
```

qa:
```markdown
---
track: qa
id: qa-02-tier-update-false-premise
false_premise: true      # 선택. 틀린 전제 반박 가드
must:                    # 답변에 반드시 있어야 할 사실
  - service-role
must_not:                # 답변에 있으면 안 되는 오류
  - yes, a logged-in user can update tier directly
title: ...
---
<질문 = 응답자 입력>
```

## 구조

```
eval/harness/
  run.ts              # 라이브 러너(회귀 게이트). npm run eval
  lib/
    parse.ts          # frontmatter/케이스 파서 (순수)
    aggregate.ts      # 집계 + 리포트 포매팅 (순수)
    subjects.ts       # 두 subject: 리뷰어 / 응답자 (sonnet)
    judge.ts          # LLM-as-judge (opus), 프롬프트 빌더는 순수 분리
    anthropic.ts      # SDK 응답 파싱 헬퍼
    env.ts            # .env.local 로더
    *.test.ts         # 키 없는 무결성/균형 테스트
  cases/
    review/*.md
    qa/*.md
  reports/            # last-run.md / last-run.json (git 무시)
```

## 모델 오버라이드

```bash
EVAL_SUBJECT_MODEL=claude-sonnet-4-6 EVAL_JUDGE_MODEL=claude-opus-4-8 npm run eval
```

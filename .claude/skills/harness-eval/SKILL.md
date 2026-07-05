---
name: harness-eval
description: >-
  finsight의 "하네스 품질"(가드레일이 룰 위반을 잡고, 라이브 CLAUDE.md가 코드베이스 질문에
  정확히 답하는가)을 golden set으로 측정하는 회귀 게이트를 돌린다. "하네스 eval 돌려줘",
  "harness eval", "회귀 게이트", "가드레일 테스트", "eval 돌려줘", "golden set 검증",
  "리뷰어/응답자 품질 확인", "LLM-as-judge 채점" 같은 요청에서 이 스킬을 쓴다.
  eval/harness/ 에 위치. 무결성 검사는 키 없이(npm test), 라이브 채점은 과금(npm run eval).
---

# 하네스 품질 eval (회귀 게이트)

비즈니스 로직이 아니라 **하네스 자체의 품질**을 측정한다. 두 트랙:
- **review**: 경량 리뷰어(sonnet temp0, CLAUDE.md CRITICAL 룰 요약이 시스템 프롬프트)가
  코드 스니펫의 룰 위반을 잡는가. 위반 4 + 오탐 방지(정상) 1.
- **qa**: 응답자가 라이브 `CLAUDE.md`를 컨텍스트로 규약·gotcha 질문에 답하는가.
  사실(must/must_not) 채점 + 틀린 전제 반박 가드 1.

채점은 subject와 **다른 모델(opus)** 이 LLM-as-judge로 pass/fail. 하나라도 실패하면 exit 1.
정본·설계는 `eval/harness/README.md`.

## 실행 절차

1. **먼저 무결성/균형부터 (키·네트워크·과금 없음).** golden set이 깨지지 않았고
   "위반 4+/정상 1+/틀린 전제 1+" 균형이 지켜지는지 vitest로 확인한다.

   ```bash
   npm test          # 전체. 또는 eval만: npx vitest run eval/harness
   ```

2. **라이브 채점 (과금 — 실행 전 반드시 사용자 확인).** subject 실행 + opus judge.
   9케이스 × (subject + judge) ≈ 18회 Claude API 호출. 예상 호출 수·비용을 알리고 승인받은 뒤 실행.

   ```bash
   npm run eval
   ```

   - `.env.local`의 `ANTHROPIC_API_KEY`를 쓴다.
   - 결과를 콘솔에 케이스별 PASS/FAIL로 출력하고 `eval/harness/reports/last-run.html`(+`.json`)로 저장한다.
   - 하나라도 실패하면 `process.exitCode=1` (회귀 게이트). 리포트를 사용자에게 보여준다.
   - 모델 오버라이드: `EVAL_SUBJECT_MODEL` / `EVAL_JUDGE_MODEL` 환경변수.

## golden set 관리

- **작게 시작하고 라벨은 사람이 박제한다.** `eval/harness/cases/{review,qa}/*.md`의
  frontmatter 라벨(`expect`, `must`, `must_not`, `false_premise`)은 사람이 정하는 ground truth다.
  모델이 라벨을 만들지 않는다.
- 케이스를 추가하면 `balance.test.ts`가 균형(위반/정상/틀린 전제 개수)을 지킨다 — 먼저 `npm test`로 통과 확인.
- CRITICAL 룰(A1~A3, 카테고리 enum, TDD, 이중 관리)이 바뀌면 관련 케이스와 라벨을 사람이 갱신한다.

## 주의

- `npm run eval`은 **유료 Claude API 호출**이다. 실행 전 확인받는다. `npm test`(무결성)는 무료 — 확인 없이 돌려도 된다.
- 파서/집계는 순수 함수(`lib/parse.ts`, `lib/aggregate.ts`)로 분리돼 키 없이 검증된다.
  라이브 채점만 `run.ts`로 분리했다 — 이 경계를 무너뜨리지 말 것(CI 유닛 테스트가 네트워크를 타면 안 된다).
- judge가 특정 케이스를 과하게 엄격히/느슨히 채점하면 프롬프트(`lib/judge.ts`)를 캘리브레이션한다.
  단 판정 완화는 사람이 라벨을 재확인한 뒤에만.

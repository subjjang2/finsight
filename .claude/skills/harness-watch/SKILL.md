---
name: harness-watch
description: >-
  백그라운드로 실행 중인 harness(scripts/execute.py)의 진행 상황을 한 번에 요약하고
  완료/에러까지 자동으로 따라간다. "harness 진행상황", "harness 어디까지 됐어",
  "0-mvp 진행 확인", "execute.py 진행 요약", "phase 진행 모니터링", "harness 모니터링",
  "1분마다 진행 업데이트" 같은 요청에서 반드시 이 스킬을 쓴다. 매분 같은 폴링 프롬프트를
  손으로 반복하지 말고 이 스킬로 대체한다.
---

# harness 진행 모니터링

`scripts/execute.py <phase-dir> [--push]`는 phase 안의 step들을 codex로 순차 실행하며
`phases/<phase-dir>/index.json`의 step status와 `feat-<phase>` 브랜치 커밋을 갱신한다.
이 스킬은 그 진행 상황을 **수동 폴링 없이** 요약·추적한다.

## 핵심 원칙 — 매분 폴링하지 말 것

- execute.py를 **백그라운드 작업(`run_in_background: true`)으로 띄웠다면**, 완료 시 harness가
  자동으로 너를 다시 깨운다. 그러니 `sleep` 루프나 매분 동일 프롬프트 재입력은 **불필요하다.**
  → 백그라운드 작업이 살아있으면 그냥 완료 알림을 기다리고, 사용자가 "지금 어디까지 됐어"라고
  물을 때만 아래 *진행 읽기*를 1회 수행해 요약한다.
- **주기적 자동 점검을 원하면** `sleep`/`ScheduleWakeup` 수동 반복 대신 `/loop`를 쓴다:
  `/loop 60s /harness-watch 0-mvp` → 60초마다 이 스킬을 자동 실행.
- execute.py가 백그라운드 작업으로 추적되지 않는 경우(예: `!python3 scripts/execute.py`로
  사용자가 직접 실행)에만, 한 번 요약 후 다음 점검까지 `ScheduleWakeup`을 1회 건다(>=60초).

## 진행 읽기 (1회 수행)

대상 phase 디렉터리를 `<phase>`라 할 때 (기본값은 첫 pending phase, `phases/index.json` 참조):

1. **step 상태 집계** — `phases/<phase>/index.json`의 `steps[]`를 읽어
   `completed / pending / error / blocked` 개수와 "N/총 step" 진척도를 낸다.
2. **현재 step** — 첫 `pending`(또는 `error`/`blocked`) step의 `name`을 현재 작업으로 본다.
3. **완료 step 요약** — `completed` step들의 `summary`를 한 줄씩(최근 1~2개만).
4. **브랜치 커밋** — `git log --oneline -5 feat-<phase>`로 실제 반영 여부 확인.
5. **출력 산출물** — 방금 끝난 step의 `phases/<phase>/stepN-output.json`이 있으면 핵심만 본다.

요약은 **3줄 이내**로: `진척 X/Y · 현재: <step> · 최근: <summary 한 줄>`.

## 멈춰야 하는 신호 — 사용자에게 즉시 알린다

- 어떤 step의 `status == "error"` → `error_message`를 보여주고 폴링을 멈춘다.
  (재시도는 원인 수정 후 status를 `pending`으로 되돌려야 함 — execute.py 규약.)
- `status == "blocked"` → `blocked_reason`을 보여주고 사용자 결정을 받는다.
- `phases/index.json`의 해당 phase가 `completed`면 완료 보고하고 종료.

## 주의

- JSON은 utf-8로 읽는다(파일에 한글·`—` 포함, cp949로 읽으면 깨짐).
- 진행 파일을 **수정하지 않는다** — 읽기 전용 모니터링이다. status 갱신은 execute.py/codex 몫.

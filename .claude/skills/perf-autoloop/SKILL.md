---
name: perf-autoloop
description: >-
  finsight 웹앱을 Lighthouse로 측정하고, karpathy/autoresearch 방식의 자기개선 루프로
  목표 점수(또는 정체)까지 자동 반복 최적화한다. "성능 최적화", "lighthouse 최적화",
  "lighthouse 점수 올려줘", "성능 점수 개선", "웹 성능 자동 최적화", "core web vitals 개선",
  "성능 루프 돌려줘", "autoperf", "성능 회귀 확인" 같은 요청에서 이 스킬을 쓴다.
  매번 수동으로 빌드·측정·수정·재측정을 반복하지 말고 이 루프로 자동화한다.
---

# perf-autoloop — Lighthouse 자기개선 최적화 루프

karpathy/autoresearch의 루프(수정 → 고정예산 실험 → 지표 개선 시 keep·악화 시 revert → 반복)를
웹 성능 최적화에 이식한 것. 구성 3요소는 이미 repo에 있으며 이 스킬은 그 실행 절차다.

- **측정 하네스** `scripts/perf/lighthouse-run.mjs` — prod 빌드를 부팅해 Lighthouse 4카테고리
  (performance·accessibility·best-practices·seo)를 N회 측정하고 중앙값 + **연속 cost 지표**
  (LCP/TBT/CLS/SI/bytes 가중합, 낮을수록 좋음)를 `reports/perf/<label>/summary.json` 과
  per-route HTML 리포트로 낸다. cost는 점수가 100에 포화돼도 항상 gradient가 있는 목표값.
- **루프** `.claude/workflows/autoperf.js` — Claude Code Workflow. 반복마다 experiment 서브에이전트가
  최적화 1건을 정밀하게 적용·측정하고, 결정적 게이트(categoryScoreSum↑ 또는 동점 시 cost 3%↓,
  카테고리 회귀 없음)로 keep/revert를 판정한다.
- **대시보드** `scripts/perf/dashboard.mjs` — 루프 결과 JSON → `docs/perf-autoloop.html` (반복별 점수·cost 추이 + 채택/반려 표).

## 0. 실행 전 확정 (건너뛰지 말 것)

- **측정 대상 URL**: 기본은 로컬 prod 빌드(`localhost`). autoresearch에 가장 충실하고 재현성 높음.
  배포 URL 측정을 원하면 매 반복 배포가 필요해 루프가 무거워지므로 별도 확인.
- **대상 라우트**: 기본 `/`. 인증이 필요한 `/dashboard/*` 는 Lighthouse에 세션 쿠키 주입이 필요하니 요청 시에만.
- **예산/종료조건**: `maxIterations`(기본 6) · `plateau`(기본 2회 연속 정체) · `targetSum`(기본 400).
  Workflow 서브에이전트가 반복마다 토큰을 소비하므로, 넓게 돌리기 전에 예상 반복 수를 사용자에게 알린다.
- **커밋 격리**: 루프는 개선분을 커밋으로 보존한다. 현재 브랜치와 섞이지 않게 전용 브랜치
  (`perf/lighthouse-autoloop` 등)를 만들고, **커밋 안 된 무관 untracked 파일이 있으면**
  revert 시 `git clean` 금지 — 실험이 바꾼 파일만 정밀 revert한다.

## 1. 준비

```bash
# 최초 1회: 의존성
npm install --save-dev lighthouse chrome-launcher   # 이미 있으면 생략
git checkout -b perf/lighthouse-autoloop            # 전용 브랜치
# 하네스/루프/대시보드가 uncommitted면 먼저 커밋해 깨끗한 복원 지점을 만든다
```

Windows 주의: **하네스는 PowerShell로 실행**한다. Git Bash는 `--routes /` 의 `/` 를
MSYS 경로(`C:/Program Files/Git/`)로 망가뜨린다.

## 2. baseline 측정

```powershell
node scripts/perf/lighthouse-run.mjs --label baseline --routes / --runs 3
```

`reports/perf/baseline/summary.json` 의 `categoryScoreSum` / `totalCost` / `opportunities` /
`diagnostics` 를 읽어 개선 여지를 확인한다. 여지가 없으면(400/400) 루프를 돌릴 필요 없음.

## 3. 루프 실행 (Workflow)

사용자가 Workflow/서브에이전트 사용에 동의했는지 확인한 뒤:

```
Workflow({ name: "autoperf",
           args: { routes: "/", maxIterations: 6, plateau: 2, targetSum: 400 } })
```

백그라운드로 돈다. 반복마다: experiment 에이전트(수정+측정) → 결정적 keep/revert 게이트 →
git 에이전트(정밀 커밋 또는 정밀 revert). `target_reached` / `plateau` / `max_iterations` 중
하나로 종료하며, 완료 시 `{ baseline, best, iterations, stopReason }` 를 반환한다.

## 4. 대시보드 생성

Workflow 반환값을 `reports/perf/autoperf-log.json` 로 저장한 뒤(`generatedAt` 스탬프 추가 권장):

```powershell
node scripts/perf/dashboard.mjs
# → docs/perf-autoloop.html
```

사용자에게 `docs/perf-autoloop.html` 을 브라우저로 보여준다(SendUserFile render 또는 안내).

## 5. 마무리

- 채택된 최적화는 `perf(auto): ...` 커밋으로 브랜치에 남는다. `git log --oneline` 으로 확인 후
  사용자에게 PR/머지 여부를 묻는다(자동 푸시 금지).
- 정체로 끝났으면 대시보드의 잔여 `opportunities`/`diagnostics` 를 근거로 다음 후보를 제안한다.
- 새 라우트·측정 방식을 추가하면 하네스와 이 SKILL.md에 함께 반영한다.

## 왜 점수(0~100)가 아니라 cost인가

Lighthouse **performance 점수는 가벼운 정적 페이지에서 100에 포화**돼 gradient가 사라진다
(finsight `/` 가 그 예). 그러면 루프가 개선을 감지 못한다. autoresearch의 val_bpb처럼
**연속적이고 낮을수록 좋은 cost** 를 2차 목표로 두어야 점수가 만점이어도 바이트·블로킹 시간을
계속 줄이는 방향의 gradient가 유지된다. 1차 목표는 categoryScoreSum(합 400), 2차는 cost.

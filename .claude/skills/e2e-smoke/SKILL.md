---
name: e2e-smoke
description: >-
  finsight의 로컬 E2E 브라우저 스모크 테스트를 정본 시나리오대로 한 번에 실행한다.
  "E2E 돌려줘", "스모크 테스트", "브라우저 테스트", "전체 플로우 테스트",
  "업로드부터 분석까지 테스트", "로그인 흐름 테스트", "결제 플로우 테스트",
  "회귀 테스트 돌려줘" 같은 요청에서 반드시 이 스킬을 쓴다. 매번 수동으로 빌드·로그인·
  클릭하지 말고 이 스킬로 정본 시나리오를 재현한다.
---

# 로컬 E2E 스모크 테스트

정본은 **`docs/E2E_TEST_SCENARIOS.md`** 와 **`tests/e2e/`**(시나리오당 1파일, `s1`~`s8`).
이 스킬은 그 정본을 절차로 묶은 것이다 — 세부가 충돌하면 항상 문서가 우선이고,
새 흐름을 추가하면 문서와 `tests/e2e/`에도 반영한다.

## 0. 범위·인증을 먼저 정한다 (건너뛰지 말 것)

- **인증 불필요(S1~S5)** 는 확인 없이 바로 실행한다.
- **로그인 포함(S6~S8)** 은 실행 전에 반드시 묻는다: **"임시 우회(E2E_LOCAL)로 할지,
  정식 Supabase 인증으로 할지"**. 임의로 우회 모드를 켜지 않는다. (메모리 규칙: 로그인 테스트 전 확인)
- **S8은 Claude 유료 호출**(매핑 1 + 분류 1)이 발생한다 → 실행 전 **사용자 비용 승인 필수**,
  유효한 `ANTHROPIC_API_KEY` 필요. 승인 없으면 S7까지만 돌린다.

사용자가 범위를 안 주면 기본값은 **S1~S7**(과금 없는 전체 플로우)로 제안하고 확인받는다.

## 1. 서버 기동 — 프로덕션 빌드로 (dev 서버 금지)

`next dev`는 Stop 훅의 `npm run build`가 `.next`를 덮어써 청크가 깨진다. 반드시 빌드 후 start.

```powershell
# S6~S8을 우회 모드로 돌릴 때만 두 env 모두 설정 (NEXT_PUBLIC_*는 빌드 시 번들에 인라인됨)
$env:E2E_LOCAL="1"; $env:NEXT_PUBLIC_E2E_LOCAL="1"
npm run build
npx next start -p 3000      # package.json "start"는 $PORT(bash) 문법이라 Windows에서 깨짐

# S1~S5만 돌릴 때는 env 없이 정식 빌드/실행
```

헬스체크: `GET /api/health` → `{"ok":true}` 확인 후 진행.

## 2. 시나리오 실행 — dev-browser headless

```powershell
dev-browser --headless --timeout <초> run tests/e2e/<파일>.js
```

선택 범위의 시나리오를 **순서대로** 실행하고, 각 파일의 기대 결과(문서 "시나리오 상세")와
대조한다. 실패하면 스크린샷(`~/.dev-browser/tmp/`)과 함께 어느 단계에서 깨졌는지 보고한다.
- 멀티라인 스크립트는 stdin 파이프가 멈추므로 **반드시 파일로 저장 후 `run`**.
- QuickJS 제약: `fs`/`require` 없음. 파일 업로드는 `setInputFiles({name,mimeType,buffer})`로 바이트 주입.

## 3. 결제(Pro) 검증 후 정리

S8 또는 Polar 흐름으로 tier가 `pro`로 올라갔다면, free 재테스트를 위해 **`reset-tier` 스킬**로
되돌린다. (E2E_LOCAL 인메모리 모드는 기본이 free이고 set-tier로 못 바꾸니, 실제 Supabase DB에서
올라간 경우에만 해당.)

## 4. 결과 보고

- 실행한 시나리오 목록 · 통과/실패 · 실패 단계 · 스크린샷 경로.
- 새로 발견한 버그는 `docs/E2E_TEST_SCENARIOS.md`의 "알려진 이슈 / 발견 기록"에 추가 제안.

## 주의

- 우회 모드는 임시 수단이며 프로덕션과 무관하다 — 정식 인증 흐름 검증은 별도로 한다.
- 운영 DB를 가리키는 `.env.local`에서 reset-tier(service-role)를 돌리지 않는다.

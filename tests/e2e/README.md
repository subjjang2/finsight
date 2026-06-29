# tests/e2e — 브라우저 E2E 스크립트

`dev-browser`(headless)로 실행하는 브라우저 테스트 스크립트. 시나리오 정의·기대값은 `docs/E2E_TEST_SCENARIOS.md`가 정본이며, 이 폴더는 그 실행 스크립트다.

> 이 `.js`들은 vitest가 아니라 **dev-browser QuickJS 샌드박스**에서 돌아간다. `npm run test`(vitest)와 무관하다.

## 사전 준비

```powershell
# 인증 불필요 시나리오(S1~S5): 정식 빌드로
npm run build
npx next start -p 3000

# 인증 필요 시나리오(S6~S8): E2E 우회 모드로 (실행 전 인증 정책 확인!)
$env:E2E_LOCAL="1"; $env:NEXT_PUBLIC_E2E_LOCAL="1"
npm run build
npx next start -p 3000
```

## 실행

```powershell
dev-browser --headless --timeout 45  run tests/e2e/s1_landing.js
dev-browser --headless --timeout 45  run tests/e2e/s2_auth_redirect.js
dev-browser --headless --timeout 45  run tests/e2e/s3_login_validation.js
dev-browser --headless --timeout 45  run tests/e2e/s4_login_fail.js
dev-browser --headless --timeout 45  run tests/e2e/s5_tab_toggle.js
dev-browser --headless --timeout 60  run tests/e2e/s6_login_pass.js   # 인증
dev-browser --headless --timeout 90  run tests/e2e/s7_nav_logout.js   # 인증 (S6 이후)
dev-browser --headless --timeout 150 run tests/e2e/s8_upload_analyze.js # 인증 + Claude 과금
```

각 스크립트는 `{ ..., "pass": true|false }` JSON을 출력하고 스크린샷을 `~/.dev-browser/tmp/`에 저장한다.

## ⚠️ 주의
- **로그인 포함 시나리오(S6~S8) 실행 전 우회/정식 인증 여부를 사용자에게 확인.** E2E 우회는 임시 수단.
- **S8은 실제 Claude(Sonnet) 유료 호출**(매핑 1 + 분류 1)이 발생하므로 사전 승인 필요.
- 페이지 이름 `e2e`로 세션이 공유된다. S6 로그인 → S7/S8이 그 쿠키를 재사용. 깨끗한 상태가 필요하면 S2(미인증)부터.

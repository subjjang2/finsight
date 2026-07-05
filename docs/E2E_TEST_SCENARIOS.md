# finsight E2E 브라우저 테스트 시나리오

브라우저 자동화(`dev-browser`, headless)로 finsight의 사용자 흐름을 검증하는 시나리오 정본. **매 브라우저 테스트 시 이 문서를 참조**한다. 새 흐름을 테스트하면 여기에 시나리오를 추가한다.

---

## ⚠️ 인증 정책 (반드시 먼저 읽을 것)

- **로그인 우회(`E2E_LOCAL` 모드)는 임시 수단이다.** 인메모리 페이크 백엔드로 "아무 값이나 입력해도 로그인 통과"시켜 인증 이후 화면을 테스트하기 위한 것이며, 프로덕션과 무관하다.
- 추후에는 **정식 프로세스(실제 Supabase 이메일/비밀번호 인증)** 로 로그인 흐름을 테스트한다.
- 따라서 **로그인이 포함된 시나리오(S6~S8 등)를 실행하기 전에는 반드시 사용자에게 "임시 우회로 할지, 정식 인증으로 할지" 물어본다.** 임의로 우회 모드를 켜지 않는다.
- 인증이 필요 없는 시나리오(S1~S5)는 확인 없이 바로 실행해도 된다.

---

## 실행 환경

### 서버: 프로덕션 빌드 + `next start` (dev 서버 금지)
`next dev`로 띄우면 매 턴 종료 시 Stop 훅의 `npm run build`(`next build`)가 같은 `.next`를 덮어써 dev 서버 청크가 깨진다(`Cannot find module './331.js'`). 그래서 **프로덕션 빌드로 테스트**한다.

```powershell
# 인증 우회 시나리오(S6~S8)를 돌릴 때만 E2E env 두 개를 모두 설정한다.
# NEXT_PUBLIC_*는 빌드 시 미들웨어 번들에 인라인되므로 빌드·실행 모두에 필요.
$env:E2E_LOCAL="1"; $env:NEXT_PUBLIC_E2E_LOCAL="1"
npm run build
npx next start -p 3000      # package.json "start"는 $PORT(bash) 문법이라 Windows에서 깨짐 → 직접 next start

# 인증 불필요 시나리오(S1~S5)만 돌릴 때는 env 없이 빌드/실행한다(정식 빌드).
```

서버 헬스: `GET /api/health` → `{"ok":true}`.

### 러너: dev-browser
실행 스크립트는 **`tests/e2e/`에 영구 저장**돼 있다(`tests/e2e/README.md` 참조). 각 시나리오 = 한 파일.
```powershell
dev-browser --headless --timeout <초> run tests/e2e/<시나리오>.js
```
- 멀티라인 스크립트는 stdin 파이프가 백그라운드에서 멈추므로 **파일로 저장 후 `run`** 사용.
- QuickJS 샌드박스 제약: `fs`/`TextEncoder`/`require` 없음. 파일 업로드는 `setInputFiles({ name, mimeType, buffer })`로 바이트를 직접 주입(수동 UTF-8 인코딩 필요).
- 스크린샷: `await saveScreenshot(await page.screenshot(), "name.png")` → `~/.dev-browser/tmp/`.

---

## 시나리오 목록

| # | 시나리오 | 인증 | 비용 | 상태 |
|---|---------|------|------|------|
| S1 | 랜딩 → 로그인 이동 | 불필요 | 없음 | ✅ |
| S2 | 미인증 `/dashboard` → `/login` 리다이렉트 | 불필요 | 없음 | ✅ |
| S3 | 로그인 폼 네이티브 검증 | 불필요 | 없음 | ✅ |
| S4 | 잘못된 자격증명 에러 메시지 | 불필요 | 없음 | ✅ |
| S5 | 로그인/회원가입 탭 전환 | 불필요 | 없음 | ✅ |
| S6 | 로그인 → 대시보드(빈 상태) | **필요** | 없음 | ✅ (우회) |
| S7 | 네비게이션 + 로그아웃 + 재게이팅 | **필요** | 없음 | ✅ (우회) |
| S8 | 업로드 → AI 매핑 → 분석 → 인사이트 | **필요** | **Claude 과금** | ✅ (우회) |

---

## 시나리오 상세

### S1 — 랜딩 → 로그인 이동
- **목적**: 랜딩 페이지 렌더 및 CTA 동작.
- **전제**: 없음.
- **단계**: `/` 진입 → "로그인으로 이동" 클릭.
- **selector**: `h1`, `a:has-text("로그인으로 이동")`.
- **기대**: `h1` = "지출 분석 준비 중", 클릭 후 URL `/login`.

### S2 — 미인증 대시보드 접근 리다이렉트
- **목적**: middleware 인증 게이팅.
- **전제**: 로그인 안 된 상태(쿠키 없음).
- **단계**: `/dashboard` 진입.
- **기대**: `/login?next=%2Fdashboard`로 307 리다이렉트.

### S3 — 로그인 폼 네이티브 검증
- **목적**: HTML5 `required`/`type=email`/`minLength=6` 검증.
- **단계**: `/login`에서 (1) 빈 제출 (2) 짧은 비번 (3) 잘못된 이메일 형식 입력.
- **selector**: `input#email`, `input#password`, `button[type="submit"]`. 검증은 `el.validity.{valueMissing,tooShort,typeMismatch}`로 확인.
- **기대**: 각각 `valueMissing` / `tooShort` / `typeMismatch` = true. (이 폼은 JS 검증 메시지가 아니라 네이티브 검증만 사용.)

### S4 — 잘못된 자격증명 로그인 실패
- **목적**: 서버 액션(Supabase) 인증 실패 메시지.
- **단계**: 형식상 유효한 이메일 + 임의 비번 제출.
- **selector**: 결과 메시지 `p[aria-live="polite"]`.
- **기대**: "이메일 또는 비밀번호를 확인해 주세요." 표시.
- **주의**: `.env.local`이 placeholder면 Supabase 연결 실패도 동일 메시지를 내므로, "에러 UI가 동작한다"까지만 검증된다.

### S5 — 로그인/회원가입 탭 전환
- **목적**: 탭 토글에 따른 제출 버튼/안내 문구 변화.
- **단계**: `/login`에서 "회원가입" 탭 클릭.
- **selector**: 탭 `button:has-text("회원가입")`, 제출 `button[type="submit"]`.
- **기대**: 제출 버튼 텍스트 "로그인" → "계정 만들기".

### S6 — 로그인 → 대시보드 (인증 필요)
- **목적**: 로그인 성공 후 대시보드 빈 상태.
- **전제**: ⚠️ 인증 정책 확인 후 진행. (우회 모드면 아무 값이나 통과.)
- **단계**: `/login`에서 이메일/비번 입력 → 제출 → `/dashboard` 대기.
- **기대**: URL `/dashboard`, `h1` "인사이트", "분석 이력이 없습니다" 빈 상태.

### S7 — 네비게이션 + 로그아웃 (인증 필요)
- **목적**: 사이드바 이동 및 세션 종료.
- **단계**: `/dashboard/upload`("명세서 업로드") → `/dashboard/trend`("월별 추이") → `/dashboard/pricing`("요금제", Free/Pro 카드) → "로그아웃" 클릭.
- **selector**: 페이지 `h1`, 로그아웃 `button:has-text("로그아웃")`.
- **기대**: 각 `h1` 일치, 요금제는 로그인 상태 카드 노출("로그인이 필요합니다" 없음), 로그아웃 후 `/login`, 이후 `/dashboard` 재접근 시 다시 `/login`으로 게이팅.

### S8 — 업로드 → AI 자동 매핑·분석 → 인사이트 (인증 + Claude 과금)
- **목적**: 핵심 파이프라인(컬럼 자동 매핑·거래 분류) 실제 Sonnet 검증. 매핑 확인 단계는 없다(ADR-007a).
- **전제**: ⚠️ 인증 정책 확인 + **유료 Claude 호출(매핑 1 + 분류 1) 사전 승인 필수**. 유효한 `ANTHROPIC_API_KEY` 필요.
- **단계**:
  1. 로그인 → `/dashboard/upload`.
  2. `input[type="file"]`에 CSV 주입(buffer 페이로드).
  3. **매핑 확인 화면 없음** — 주입 즉시 매핑 추정(mapColumns) → 분류(classifyTransactions)가 자동으로 이어짐. 로딩 문구 "CSV를 읽고 컬럼을 매핑하는 중입니다." 노출.
  4. 자동 완료 후 `/dashboard`로 이동 대기.
- **기대**: 분석 후 대시보드에 "총 지출"·"카테고리별 지출"·"최근 지출 요약" 표시, 에러 없음.
- **샘플 CSV 헤더**: `거래일자,가맹점,이용금액,승인번호`.

---

## E2E 우회 모드 구조 (참고)

`E2E_LOCAL=1`(+ 빌드용 `NEXT_PUBLIC_E2E_LOCAL=1`)에서만 활성, 프로덕션 무영향:
- `lib/e2e.ts` — 인메모리 스토어 + 페이크 Supabase 클라이언트 + 순수 라우팅 결정 함수(`e2eRouteDecision`).
- `lib/supabase/server.ts` / `middleware.ts` / `app/(auth)/login/actions.ts` — `isE2E()` 분기로 페이크/쿠키 기반 인증 사용.
- 세션 쿠키: `e2e_session=1` (httpOnly). `authenticate`가 어떤 입력이든 이 쿠키를 발급, `signOut`이 삭제.

---

## 알려진 이슈 / 발견 기록

- **(수정됨) Claude 구조화 출력 스키마 버그**: `services/claude.ts`의 컬럼 매핑 스키마가 `confidence`에 `minimum`/`maximum`를 보내 Anthropic API가 400(`For 'number' type, properties maximum, minimum are not supported`)을 반환 → 실 키 호출 시 모든 업로드가 503으로 실패했었다. min/max 제거로 수정(코드에 `clamp(0,1)` 존재), 회귀 테스트 `services/claude.test.ts` 추가. SDK 목킹 테스트로는 못 잡던 케이스.
- **`package.json` `start` 스크립트**: `next start -p $PORT`는 bash 문법이라 Windows npm(cmd)에서 깨진다. `next start -p 3000` 직접 실행 또는 `cross-env` 권장.
- **dev 서버 vs Stop 훅 build의 `.next` 충돌**: 위 "실행 환경" 참고. 테스트는 프로덕션 빌드로.

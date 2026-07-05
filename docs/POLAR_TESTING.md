# Polar 결제 연동 테스트 가이드

Polar(Merchant of Record) 구독 결제가 로컬에서 끝까지 동작하는지 확인하는 방법.
연동은 **두 갈래의 비동기 흐름**이라, 각각 따로 검증한다.

```
[업그레이드 클릭] → POST /api/polar/checkout → Polar 호스팅 결제 페이지   (체크아웃 경로)
[결제 완료] → Polar 웹훅 → POST /api/polar/webhook → profiles.tier=pro    (웹훅 경로)
```

관련 코드: `lib/billing/checkout.ts`, `lib/billing/polar.ts`,
`app/api/polar/checkout/route.ts`, `app/api/polar/webhook/route.ts`,
복귀 UX는 `components/dashboard/CheckoutSuccessWatcher.tsx`.

## 0. 환경변수 (`.env.local`)

| 변수 | 설명 |
|------|------|
| `POLAR_ACCESS_TOKEN` | 서버 전용. 체크아웃 생성에 사용 |
| `POLAR_PRO_PRODUCT_ID` | Pro를 부여하는 Polar 제품 id |
| `POLAR_WEBHOOK_SECRET` | 웹훅 서명 검증용. Polar 대시보드 엔드포인트의 Signing Secret과 **동일**해야 함 |
| `POLAR_API_BASE` | Sandbox 테스트 시 `https://sandbox-api.polar.sh`. 미설정 시 프로덕션 |
| `NEXT_PUBLIC_SITE_URL` | OAuth 콜백·체크아웃 origin 기준. 로컬은 `http://localhost:3000` |

## 1. 체크아웃 경로 스모크 체크 (네트워크만, 결제 없음)

토큰 유효성 + 제품 존재 + 체크아웃 세션 생성을 한 번에 확인한다. 결제는 발생하지 않는다.

```bash
npm run polar:check
```

`OK — checkout path is reachable.` 가 나오면 토큰/제품/API 도달은 정상.
(스크립트는 비밀키를 출력하지 않는다. `scripts/polar-sandbox-check.mjs`)

## 2. 웹훅까지 포함한 전체 E2E (로컬)

로컬은 외부에서 접근이 안 되므로 Polar가 웹훅을 보내려면 **터널**이 필요하다.

1. dev 서버: `npm run dev` (3000)
2. 터널: `ngrok http 3000` → 공개 URL 확보 (`http://localhost:4040`에서 요청 로그 확인)
3. **Polar sandbox 대시보드 → Settings → Webhooks → Add Endpoint**
   - URL: `https://<ngrok>/api/polar/webhook`
   - Secret: `.env.local`의 `POLAR_WEBHOOK_SECRET`와 동일
   - Events: `subscription.active`, `subscription.created`, `subscription.updated`,
     `subscription.uncanceled`, `subscription.revoked`, `subscription.canceled`
     (`uncanceled`는 해지 취소 후 재활성 재부여용 — 빠뜨리면 재업그레이드가 안 뜬다)
4. `http://localhost:3000` 로그인 → `/dashboard/pricing` → **업그레이드**
5. 테스트 카드: `4242 4242 4242 4242`, 만료일 미래, CVC 임의, 우편번호 임의
6. 확인:
   - ngrok(`:4040`)에서 `POST /api/polar/webhook` → **200**
   - `/dashboard/pricing` 복귀 시 "결제 확인 중…" 배너가 떴다가, 웹훅 반영 후 Pro로 자동 갱신
     (force-dynamic 페이지를 폴링 새로고침 — `lib/billing/checkout-status.ts`)

## 3. 웹훅 401 진단 (서명 함정)

Polar는 웹훅 HMAC 키로 **시크릿 문자열 전체(`whsec_…` 포함)를 UTF-8 raw 바이트**로 쓴다.
Standard Webhooks 스펙(`whsec_` 제거 후 base64 디코드)과 다르다. 그래서
`verifyPolarSignature`(`lib/billing/polar.ts`)는 **두 후보 키 중 하나라도 맞으면 통과**하도록 되어 있다.
회귀 방지 테스트: `tests/billing-polar.test.ts`.

`POST /api/polar/webhook 401`이 보이면:

1. `.env.local`의 `POLAR_WEBHOOK_SECRET` == 대시보드 Signing Secret 인지 확인.
   바꿨다면 **dev 서버 재시작**(env는 핫리로드 안 됨).
2. 그래도 401이면 ngrok 인스펙터에서 실제 요청을 떠서 키 변형별로 HMAC을 맞춰본다:
   `http://127.0.0.1:4040/api/requests/http` 에서 `webhook-id`/`webhook-timestamp`/body 추출 →
   `HMAC(key, "id.timestamp.body")` 를 (a) base64 디코드 키, (b) raw UTF-8 시크릿 키로 계산해 비교.
3. 검증은 **Polar 대시보드의 Redeliver**로 한다. 오래된 캡처를 직접 재생하면
   5분 replay 가드(`verifyPolarSignature`의 timestamp tolerance)에 막힌다.

연속 401 후 Polar가 엔드포인트를 백오프/비활성 처리하면 새 이벤트가 즉시 안 올 수 있다.
대시보드에서 엔드포인트를 Enable 후 해당 이벤트를 Redeliver 한다.

## 4. tier 초기화 / 상태 확인

- 같은 고객은 활성 구독이 있으면 재결제가 막힌다("already have an active subscription").
  재테스트하려면 Polar 대시보드에서 구독을 **즉시 해지(Revoke immediately)** 한다.
  (체크아웃 토큰에 `subscriptions:write` 스코프가 없으면 API로는 해지 불가, 대시보드로.)
- **로컬 tier 리셋은 `reset-tier` 스킬 / `scripts/set-tier.mjs`로.** `profiles.tier`는 DB 트리거로 잠겨 일반 권한으론 못 바꾸므로 service-role 스크립트로 free↔pro 전환한다. SQL 직접 수정 금지.
- 해지 정책 주의: `subscription.canceled`는 기간말 예약 해지라 **즉시 강등하지 않는다**. 강등은 `subscription.revoked`/터미널 상태에서만(`lib/billing/polar.ts`). 예약 해지 후 tier가 그대로여도 정상.
- DB 확인(서버): `profiles.tier`, `webhook_events`(멱등성 기록) 조회. 웹훅은 `apply_subscription_event` RPC로 `webhook-id` 기준 트랜잭션 처리.

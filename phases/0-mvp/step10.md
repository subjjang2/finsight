# Step 10: billing-polar

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ADR.md` (ADR-004 Polar 구독, tier는 웹훅만 변경·멱등 upsert, ADR-003 service-role 웹훅 전용)
- `/docs/ARCHITECTURE.md` (Polar 웹훅 → service-role → profiles.tier 갱신, 데이터 흐름)
- `/docs/PRD.md` (티어: Free/Pro $9, MVP 제외: 연간·환불 UI·쿠폰 → Polar 호스팅 위임)
- `/AGENTS.md` (CRITICAL: POLAR_* 서버 전용, service-role 웹훅)
- `/docs/prototype/js/screens2.jsx`의 `PricingScreen`, `js/data.jsx`의 `PRICING`
- step 3: `lib/supabase/admin.ts`(createAdminClient), `lib/entitlements.ts`
- step 8: `components/ui/*` / step 9: 대시보드 화면 패턴

## 작업

Polar 구독 결제를 연결한다. 결제 UI·컴플라이언스는 Polar 호스팅에 위임하고, 앱은 **checkout 진입 + 웹훅 수신**만 담당.

1. **Pricing 화면** (`app/dashboard/pricing/page.tsx`) — `PRICING`(Free ₩0 / Pro $9, 공정사용 월 200건) 기반 플랜 비교. 현재 플랜 표시. "업그레이드" → Polar checkout 링크/세션으로 이동(서버에서 `POLAR_ACCESS_TOKEN`으로 생성, lazy). 프로토타입 `PricingScreen` 톤.
2. **`POST app/api/polar/webhook/route.ts`** — Polar 웹훅 수신.
   - `POLAR_WEBHOOK_SECRET`로 **서명 검증**(검증 실패 401). 검증된 이벤트만 처리.
   - 구독 활성/취소 이벤트에 따라 `createAdminClient()`(service-role)로 `profiles.tier`를 `'pro'`/`'free'`로 **멱등 upsert**(같은 이벤트 재수신해도 결과 동일). 사용자 식별은 Polar metadata/customer로 매핑.
   - tier 변경은 **오직 이 웹훅에서만**(ADR-004).
3. **사용량 게이팅 연동** — Pro면 `lib/entitlements`가 200건 상한, Free면 5건. step 7 analyses 라우트가 이미 `profiles.tier`를 읽으므로 추가 배선만 확인.

**핵심 규칙**:
- 웹훅은 멱등(ADR-004) — 중복 이벤트로 상태가 깨지지 않게.
- 웹훅에서만 service-role 사용. 그 외 경로는 user-scoped(ADR-003).
- 서명 검증 없는 웹훅 처리 금지.

**TDD**: 웹훅 이벤트 → tier 매핑(멱등) 순수 로직과 서명 검증 분기를 분리해 테스트를 먼저 작성하라. Polar/Supabase는 모킹. 실제 결제·웹훅 라이브 검증은 키·Polar 설정 필요 → blocked 가능.

## Acceptance Criteria

```bash
npm test        # 웹훅 tier 매핑·멱등·서명검증 분기 테스트 통과 (모킹)
npm run build   # pricing 페이지·웹훅 라우트 컴파일 에러 없음
```

## 검증 절차

1. 위 AC 커맨드를 실행한다(모킹 — 실제 Polar 키 불필요).
2. 아키텍처 체크리스트:
   - tier 변경이 웹훅에서만, 멱등 upsert (ADR-004)
   - 웹훅만 service-role, 서명 검증 존재 (ADR-003, AGENTS.md)
   - POLAR_* 키가 서버 전용, 클라 번들 미노출 (AGENTS.md CRITICAL)
   - 결제 UI는 Polar 호스팅 위임(앱 내 카드폼·환불 UI 없음) (PRD MVP 제외)
3. 결과에 따라 `phases/0-mvp/index.json`의 step 10을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "pricing 화면·polar 웹훅(멱등 tier 갱신) 요약"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`
   - 사용자 개입 필요(Polar 프로젝트·키 미설정으로 라이브 검증 불가) → `"status": "blocked"`, `"blocked_reason"` 후 중단. **코드 작성·모킹 테스트는 키 없이 완료 가능하므로 가급적 completed.**

## 금지사항

- `profiles.tier`를 웹훅 외의 경로(라우트·클라)에서 변경하지 마라. 이유: tier 단일 진실원은 웹훅(ADR-004).
- 서명 검증을 건너뛰지 마라. 이유: 위조 웹훅으로 무단 Pro 승격 가능(보안).
- 앱 내부에 카드 입력·환불·쿠폰 UI를 만들지 마라. 이유: PRD MVP 제외, Polar 호스팅 위임.
- 웹훅을 비멱등으로 만들지 마라(중복 이벤트가 카운트/상태를 망치게). 이유: ADR-004 멱등 upsert.
- 기존 테스트를 깨뜨리지 마라.

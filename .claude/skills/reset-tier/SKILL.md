---
name: reset-tier
description: >-
  로컬에서 테스트 중인 계정의 요금제(profiles.tier)를 free로 내릴(또는 다시 pro로 올릴) 때 사용한다.
  "요금제 free로 내려줘", "tier 초기화", "다시 free로", "pro 풀어줘", "구독 상태 리셋",
  "결제 테스트 끝났으니 free로", "downgrade plan" 같은 요청에서 반드시 이 스킬을 쓴다.
  profiles.tier는 DB 트리거가 막아 일반 유저 권한으론 못 바꾸므로 service-role로 직접 UPDATE 해야 한다.
---

# 요금제(tier) 로컬 리셋

로컬에서 Polar 샌드박스 체크아웃/webhook으로 `profiles.tier`를 `pro`로 올려 테스트한 뒤,
다시 `free` 흐름을 확인하려고 요금제를 내릴 때 쓴다.

## 왜 스크립트가 필요한가

`profiles.tier`는 `prevent_profile_tier_update` 트리거가 `auth.role()='authenticated'`인
변경을 막는다 — 즉 앱(일반 유저)이나 anon/authenticated 키로는 못 바꾼다. 오직 Polar
webhook이 쓰는 **service-role** 키만 통과한다. 그래서 결제 흐름을 되감는 대신
`.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`로 곧장 UPDATE 하는 `scripts/set-tier.mjs`를 쓴다.

## 실행 절차

1. **(파괴적 변경 전) 먼저 현재 상태를 보여준다.** 인자 없이 실행하면 아무것도 바꾸지 않고
   모든 계정의 tier만 출력한다. 어떤 계정을 내릴지 사용자와 맞춘다.

   ```bash
   node scripts/set-tier.mjs
   ```

2. **대상을 free로 내린다.** 위 목록에서 고른 이메일(또는 user id)을 넘긴다. tier 인자를
   생략하면 기본값이 `free`다.

   ```bash
   node scripts/set-tier.mjs tester@example.com
   ```

3. **재테스트를 위해 다시 pro로 올리려면** 두 번째 인자에 `pro`를 준다.

   ```bash
   node scripts/set-tier.mjs tester@example.com pro
   ```

성공하면 `OK — <email>: pro -> free` 형태로 변경 전/후를 출력한다. 이미 목표 tier면 변경 없이 끝낸다.

## 주의

- `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`이 가리키는 DB에 적용된다. service-role 키는 RLS를
  우회하므로 **운영 DB를 가리키는 .env.local에서는 절대 돌리지 않는다.** 실행 첫 줄에 찍히는
  `DB : ...` 주소가 로컬/샌드박스인지 사용자에게 확인시킨다.
- 어떤 계정을 내릴지 불확실하면 1번(목록 출력)을 먼저 보여주고 사용자에게 고르게 한다.
  넘긴 이메일/id가 없으면 스크립트가 에러로 멈춘다.
- E2E_LOCAL 인메모리 모드(dev 서버 globalThis 스토어)는 이 스크립트로 못 바꾼다 — 그 모드는
  기본이 이미 free이고 외부 프로세스에서 접근할 수 없다. 이 스킬은 실제 Supabase DB 전용이다.

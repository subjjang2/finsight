---
name: supabase-branching
description: >-
  finsight의 DB 마이그레이션을 프로덕션에 넣기 전에 격리된 환경에서 안전하게 검증하는 절차.
  Free 플랜에선 로컬 스택(supabase start/db reset)을 "일회용 브랜치"로 쓰고,
  Pro 승격 시 문서의 Git-integrated 호스팅 브랜칭으로 승격한다.
  "supabase 브랜칭", "브랜치 DB", "마이그레이션 검증", "마이그레이션 안전한지 확인",
  "로컬 DB로 마이그레이션 테스트", "db reset", "supabase 로컬 스택", "새 마이그레이션 만들어",
  "0006 마이그레이션", "preview 브랜치", "prod 반영 전 검증", "스키마 변경 검증" 같은
  요청에서 이 스킬을 쓴다. 미검증 마이그레이션을 prod에 직접 apply하지 말고 이 절차로 검증한다.
---

# Supabase 브랜칭 / 로컬 마이그레이션 검증

**목표: 마이그레이션 안전 검증 + 프로덕션 데이터 보호.**
정본 마이그레이션은 `supabase/migrations/`(현재 `0001`~`0005`, 4자리 순번). 스키마 규칙은 `CLAUDE.md`
아키텍처 규칙(PII 테이블 RLS 강제)을 따른다 — 충돌 시 항상 `CLAUDE.md`가 우선.

## 왜 로컬 브랜칭인가 (플랜 제약)

- 문서(supabase.com/docs/guides/deployment/branching)의 **호스팅 preview 브랜치는 Pro 이상 + 브랜치당
  시간당 과금**이 전제다. **현재 Free 플랜에선 켤 수 없다.**
- 그래서 지금은 **로컬 스택을 일회용 브랜치로** 쓴다. Docker로 로컬 Postgres를 띄우고 `db reset`으로
  마이그레이션 전체를 깨끗한 DB에서 재현 → prod는 손도 안 댄다.
- 여기서 만든 `config.toml`은 **Pro 승격 시 그대로 재사용**되므로 나중에 GitHub 연동만 켜면 호스팅
  브랜칭으로 자연스럽게 승격된다(§6).

## 0. 전제 확인 (건너뛰지 말 것)

- **Docker 실행 중인지**: `docker ps`가 성공해야 로컬 스택이 뜬다.
- **CLI**: 전역 설치 없음 → 항상 **`npx supabase`**로 호출한다(현재 2.109.x).
- **`supabase/config.toml` 존재 여부**: 없으면 §1을 먼저 한다(최초 1회). 있으면 §2로 간다.

## 1. 최초 1회: `supabase init`

`config.toml`이 없을 때만.

```bash
npx supabase init      # config.toml 생성. 기존 migrations/ 파일은 그대로 유지된다
```

- 생성된 `supabase/config.toml`, `supabase/seed.sql`은 커밋한다.
- `.gitignore`에 `supabase/.temp/`, `supabase/.branches/`가 들어갔는지 확인(로컬 상태 파일).

## 2. 로컬 스택 = 일회용 브랜치

```bash
npx supabase start                 # 로컬 Postgres+Auth+Storage 기동 (최초엔 이미지 pull로 느림)
npx supabase db reset              # 빈 DB에 0001→0005 순서대로 전체 재적용 + seed.sql
```

- `db reset`이 **에러 없이 끝나면** 마이그레이션들이 깨끗한 DB에서 순서대로 도는 것. 이게 핵심 검증.
- 실패하면 **마지막에 적용되던 마이그레이션이 범인** — 로그의 파일명·라인으로 좁힌다.
- 로컬 Studio: `http://localhost:54323`에서 스키마·RLS 눈으로 확인.
- 다 끝나면 `npx supabase stop`.

## 3. 새 마이그레이션 작성·검증 (정본 절차)

1. **파일 생성** — 기존 4자리 순번을 유지하려면 **수동으로 다음 번호**를 만든다:
   `supabase/migrations/0006_<설명>.sql` (예: `0006_add_budget_table.sql`).
   > `npx supabase migration new`는 타임스탬프 접두사(`20260705..._name.sql`)를 붙여 기존
   > `0001`~`0005` 컨벤션과 섞인다. **순번 유지를 위해 수동 4자리 파일을 권장.**
2. **SQL 작성** — 금융 PII 테이블(`transactions` 등)을 만들면 **반드시 RLS enable + 소유자
   정책**을 같은 마이그레이션에 넣는다(`CLAUDE.md` CRITICAL). RLS 없는 PII 테이블 금지.
3. **검증** — `npx supabase db reset`로 **처음부터 다시** 돌려 새 파일까지 깨끗이 적용되는지 확인.
4. (선택) `npx supabase db diff` — 로컬 스키마 대비 변경분을 눈으로 확인.
5. 타입이 스키마에 물려 있으면 `npx supabase gen types typescript --local`로 갱신.

## 4. 프로덕션 반영 (로컬 검증을 통과한 뒤에만)

- **CRITICAL: `db reset`을 통과하지 못한 마이그레이션을 prod에 직접 apply 금지.**
- 최초 1회 링크: `npx supabase link --project-ref <prod-ref>` (ref는 메모리 `finsight-prod-deploy` 참조).
- 반영: `npx supabase db push` — 미적용 마이그레이션만 prod에 순서대로 적용.
  - 먼저 `npx supabase db push --dry-run`으로 무엇이 적용될지 확인.
- MCP `apply_migration`을 쓸 경우에도 **로컬 `db reset` 통과가 선행 조건**이다.

## 5. (선택) PR 마이그레이션 CI 게이트 — 무료

prod 반영 전 "빈 DB에 전체 마이그레이션이 도는가"를 PR마다 자동 검증. `.github/workflows/`에 추가:

```yaml
name: db-migration-check
on:
  pull_request:
    paths: ["supabase/migrations/**"]
jobs:
  apply-all:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: postgres }
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 5s
          --health-timeout 5s --health-retries 10
    steps:
      - uses: actions/checkout@v4
      - name: Apply all migrations in order
        run: |
          for f in $(ls supabase/migrations/*.sql | sort); do
            echo "== applying $f"
            PGPASSWORD=postgres psql -h localhost -U postgres -v ON_ERROR_STOP=1 -f "$f"
          done
```

깨지면 merge 차단(브랜치 보호 규칙과 연동). `ai-review.yml` 옆에 둔다.

## 6. Pro 승격 시: 문서 그대로 호스팅 브랜칭으로 승격

Pro로 올린 뒤:
- `config.toml`은 이미 있으므로 **Supabase 대시보드 → GitHub 연동 → Branching 활성화**만 켜면 된다.
- 이후 **PR마다 preview 브랜치가 자동 생성**되고 `migrations/`가 자동 실행된다(**이 시점부터 과금**).
- prod 머지 시 마이그레이션이 프로덕션에 자동 반영 → §4의 수동 `db push`를 대체.
- 이때 별도 staging 프로젝트는 preview 브랜치로 대체되므로 정리한다.

## 가드레일 (요약)

- Free 플랜에선 **호스팅 preview 브랜치(과금)를 켜지 않는다.** §6은 Pro 승격 후에만.
- **미검증 마이그레이션을 prod에 직접 넣지 않는다** — 항상 로컬 `db reset` 선통과.
- PII 테이블은 **같은 마이그레이션에서 RLS enable + 정책**(`CLAUDE.md`).
- 마이그레이션 파일은 **4자리 순번(`0006_`, `0007_`…)** 을 유지한다.
- CLI는 전역 설치 대신 **`npx supabase`**.

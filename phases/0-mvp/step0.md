# Step 0: project-setup

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/AGENTS.md` (프로젝트 규칙·기술 스택·환경변수)
- `/docs/ARCHITECTURE.md` (배포·디렉토리 구조·패턴)
- `/docs/ADR.md` (ADR-001 App Router 루트, ADR-006 Railway standalone)
- `/docs/UI_GUIDE.md` (색상 토큰, AI 슬롭 안티패턴)
- `/docs/prototype/Finsight.html` 의 `:root` (정확한 디자인 토큰 hex)

이것이 그린필드 프로젝트의 첫 step이다. 아직 `package.json`·`app/`은 존재하지 않는다.

## 작업

Next.js 15 풀스택 프로젝트의 기반을 구성한다.

1. **Next.js 15 (App Router) 초기화** — 루트에 `app/` 사용, `src/` 디렉토리 금지(ADR-001). TypeScript **strict mode**. ESLint.
   - `package.json` scripts: `dev`, `build`, `start`(`next start -p $PORT`), `lint`, `test`.
   - `next.config`에 `output: "standalone"` 설정(ADR-006).
2. **Tailwind CSS 설정** — 다크모드 고정. `docs/prototype/Finsight.html`의 `:root`에 정의된 토큰 hex를 그대로 Tailwind 테마/CSS 변수로 등록한다:
   - `--canvas #0a0b0d`, `--surface #121417`, `--surface-2 #16181c`, `--surface-3 #22252b`, `--line #23262d`
   - `--ink #f3f5f6`, `--muted #9aa0a8`, `--muted-soft #6b7177`
   - `--accent #10b981`(emerald-500), `--up #34d399`, `--down #f0716b`, 에러 `#ef4444`
   - `app/globals.css`에서 `body` 기본 배경 `--canvas`, 텍스트 `--ink` 적용.
3. **테스트 러너 설정** — `npm test`로 단위테스트가 실행되도록 구성(Vitest 권장, jsdom 불필요한 순수 로직 위주). 최소 1개 smoke 테스트 포함.
4. **`.env.example`** 생성 — `AGENTS.md`의 환경변수 전체를 키만(값 없이) 나열:
   ```
   ANTHROPIC_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   POLAR_ACCESS_TOKEN=
   POLAR_WEBHOOK_SECRET=
   ```
5. **기본 라우트** — `app/layout.tsx`(다크 테마 wrapper, lang="ko"), `app/page.tsx`(임시 랜딩 자리만), `app/api/health/route.ts`(`GET` → `{ ok: true }` JSON 반환).

`.gitignore`는 이미 존재하므로 `node_modules`·`.next`·`.env*`가 포함됐는지 확인하고 누락 시 추가만 한다(전면 덮어쓰기 금지).

## Acceptance Criteria

```bash
npm install
npm run build   # standalone 빌드, 컴파일 에러 없음
npm test        # smoke 테스트 통과
```

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 아키텍처 체크리스트:
   - 루트 `app/` 사용, `src/` 없음 (ADR-001)
   - `next.config`에 `output: "standalone"` (ADR-006)
   - TypeScript strict mode 활성
   - Tailwind 토큰 hex가 `Finsight.html`의 `:root`와 일치
3. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "산출물 한 줄 요약(생성 파일·테스트 러너·스타일 토큰 등)"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message": "구체적 에러"`
   - 사용자 개입 필요 → `"status": "blocked"`, `"blocked_reason": "사유"` 후 중단

## 금지사항

- `src/` 디렉토리를 만들지 마라. 이유: ADR-001이 루트 `app/`을 강제한다.
- gradient-text, backdrop-blur, 보라/인디고 브랜드색, gradient orb를 쓰지 마라. 이유: `UI_GUIDE.md` AI 슬롭 안티패턴.
- `.env.example`에 실제 키 값을 넣지 마라. 이유: 비밀 노출.
- Pages Router(`pages/`)를 쓰지 마라. 이유: App Router 일원화.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "finsight — 카드 명세서 CSV, 1분 만에 지출 인사이트로",
  description:
    "카드사 CSV를 그대로 올리면 AI가 컬럼을 인식하고 거래를 분류해 이번 달 지출을 카테고리별로 정리합니다.",
};

const STEPS = [
  {
    n: "01",
    title: "업로드",
    body: "카드사에서 받은 CSV를 그대로 끌어다 놓으면 됩니다. 헤더 형식은 AI가 알아서 인식합니다.",
  },
  {
    n: "02",
    title: "매핑 확인",
    body: "AI가 추정한 날짜·가맹점·금액 컬럼이 맞는지 한 번만 확인하면 끝. 대부분 그대로 누르면 됩니다.",
  },
  {
    n: "03",
    title: "인사이트",
    body: "이번 달 총 지출과 1위 카테고리부터, 카테고리별 소비 흐름까지 한 화면에서 봅니다.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold tracking-tight text-ink">
          finsight
        </span>
        <a
          href="/login"
          className="text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          로그인
        </a>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-12 sm:pt-20">
        <p className="text-sm font-medium text-accent">카드 명세서 → 지출 인사이트</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
          카드 명세서 CSV,
          <br className="hidden sm:block" /> 1분 만에 지출 인사이트로.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
          카드사·형식 무관. CSV를 그대로 올리면 AI가 컬럼을 인식하고 거래를 분류해,
          이번 달 돈이 어디로 갔는지 카테고리별로 정리해 보여 줍니다.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
          >
            1분 만에 시작하기
          </a>
          <a
            href="/sample.csv"
            download
            className="inline-flex items-center justify-center rounded-lg border border-line bg-surface px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
          >
            샘플 CSV로 먼저 보기
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-soft">
          무료로 시작 · 카드 등록 없이 · 이메일/비밀번호만
        </p>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-sm font-medium text-muted">어떻게 동작하나요</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="rounded-lg border border-line bg-surface p-6"
              >
                <span className="text-sm font-semibold tabular-nums text-accent">
                  {step.n}
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-ink">
              첫 인사이트까지 1분이면 충분합니다.
            </p>
            <p className="mt-1 text-sm text-muted">
              지금 명세서 하나만 올려 보세요.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex w-fit items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
          >
            시작하기
          </a>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-soft">
          finsight · 카드 명세서 CSV 기반 지출 분석 도구
        </div>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import {
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  softwareApplicationJsonLd,
} from "../lib/seo";

export const metadata: Metadata = {
  // 홈은 타이틀 템플릿(%s | finsight)을 우회해 태그라인 전체를 그대로 노출한다.
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
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

// 미리보기 패널용 목업 데이터 — 실제 인사이트 화면의 축소판.
const PREVIEW_TOTAL = "₩1,284,500";
const PREVIEW_CATEGORIES = [
  { name: "식비", amount: "₩432,000", pct: 100, top: true },
  { name: "교통", amount: "₩246,000", pct: 57 },
  { name: "쇼핑", amount: "₩198,500", pct: 46 },
  { name: "구독", amount: "₩89,000", pct: 21 },
  { name: "기타", amount: "₩319,000", pct: 74 },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd()),
        }}
      />
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

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-10 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy + CTA */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              카드 명세서 → 지출 인사이트
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl">
              카드 명세서 CSV,
              <br className="hidden sm:block" />{" "}
              <span className="text-accent">1분</span> 만에 지출 인사이트로.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              카드사·형식 무관. CSV를 그대로 올리면 AI가 컬럼을 인식하고 거래를
              분류해, 이번 달 돈이 어디로 갔는지 카테고리별로 정리해 보여 줍니다.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
              >
                1분 만에 시작하기
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
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
          </div>

          {/* Right: insight preview (데이터가 주인공) */}
          <div className="relative">
            <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">2026년 6월</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  분석 완료
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-muted">이번 달 총 지출</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
                    {PREVIEW_TOTAL}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-down">
                    ▲ 8.2%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-soft">
                  1위 카테고리 · 식비 (34%)
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {PREVIEW_CATEGORIES.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{c.name}</span>
                      <span className="font-medium tabular-nums text-ink">
                        {c.amount}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full ${
                          c.top ? "bg-accent" : "bg-muted-soft"
                        }`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-soft">
              업로드하면 보이는 실제 인사이트 화면
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-line bg-surface-2">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-sm font-medium text-muted">어떻게 동작하나요</h2>
          <p className="mt-1 text-xl font-semibold tracking-tight text-ink">
            세 단계면 첫 인사이트까지 도착합니다.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="group rounded-lg border border-line bg-surface p-6 transition-colors hover:border-line-strong"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 text-sm font-semibold tabular-nums text-accent">
                    {step.n}
                  </span>
                  <h3 className="text-base font-semibold text-ink">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-ink">
              첫 인사이트까지 1분이면 충분합니다.
            </p>
            <p className="mt-2 text-sm text-muted">
              지금 명세서 하나만 올려 보세요. 가입은 이메일·비밀번호만.
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            시작하기
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
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

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12 text-ink">
      <section className="mx-auto max-w-5xl space-y-6">
        <p className="text-sm font-medium text-accent">finsight</p>
        <div className="rounded-lg border border-line bg-surface p-6">
          <h1 className="text-4xl font-semibold text-ink">
            카드 명세서를 올리면 지출이 정리됩니다
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            카드사 CSV를 업로드하면 거래를 자동으로 분류하고, 한 달 지출을 카테고리별로 한눈에 보여줍니다.
          </p>
          <Link
            className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
            href="/login"
          >
            시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12 text-ink">
      <section className="mx-auto max-w-5xl space-y-6">
        <p className="text-sm font-medium text-accent">finsight</p>
        <div className="rounded-lg border border-line bg-surface p-6">
          <h1 className="text-4xl font-semibold text-ink">지출 분석 준비 중</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            카드 명세서 CSV 업로드와 분석 흐름을 구성하기 위한 임시 화면입니다.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
          >
            로그인으로 이동
          </a>
        </div>
      </section>
    </main>
  );
}

import { LoginForm } from "./login-form";
import { getPostAuthRedirectPath } from "../../../lib/auth/validation";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = getPostAuthRedirectPath(params.next ?? null);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col justify-between border-b border-line px-6 py-8 lg:border-b-0 lg:border-r lg:px-16 lg:py-14">
          <div className="text-sm font-semibold text-ink">finsight</div>

          <div className="my-16 max-w-lg lg:my-0">
            <h1 className="text-4xl font-semibold leading-tight text-ink">
              카드 명세서를 올리면 지출이 정리됩니다
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              카드사 CSV를 그대로 업로드하고, 컬럼 매핑을 확인한 뒤 카테고리별 소비 흐름을 확인하세요.
            </p>
          </div>

          <p className="text-sm text-muted-soft">
            이메일/비밀번호 로그인만 제공합니다.
          </p>
        </section>

        <section className="grid place-items-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-ink">계정</h2>
              <p className="mt-2 text-sm text-muted">
                finsight 계정으로 계속하세요.
              </p>
            </div>
            <LoginForm next={next} />
          </div>
        </section>
      </div>
    </main>
  );
}

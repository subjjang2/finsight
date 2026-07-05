import { Badge, Card, ErrorState } from "../../../components/ui";
import { CheckoutButton } from "../../../components/dashboard/CheckoutButton";
import { CheckoutSuccessWatcher } from "../../../components/dashboard/CheckoutSuccessWatcher";
import { createServerClient } from "../../../lib/supabase/server";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../../../types/tier";
import type { Tier } from "../../../types/tier";

export const dynamic = "force-dynamic";

type ProfileRow = {
  tier: string;
  monthly_analysis_count: number | null;
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₩0",
    period: "/월",
    limit: FREE_MONTHLY_LIMIT,
    description: "월 5건까지 카드 명세서를 분석합니다.",
    features: ["월 5건 분석", "AI 컬럼 매핑", "카테고리 분류와 집계", "월별 추이 보관"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    period: "/월",
    limit: PRO_FAIR_USE_LIMIT,
    description: "공정사용 월 200건까지 분석합니다.",
    features: ["월 200건 공정사용 상한", "Free의 모든 기능", "심층 분석 준비", "Polar 호스팅 결제"],
  },
] as const;

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const fromCheckout = checkout === "success";
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ErrorState title="로그인이 필요합니다" message="요금제 관리는 로그인 후 확인할 수 있습니다." />;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tier, monthly_analysis_count")
    .eq("id", user.id)
    .single<ProfileRow>();

  if (error || !profile) {
    return <ErrorState title="요금제를 불러오지 못했습니다" message={error?.message ?? "프로필이 없습니다."} />;
  }

  const currentTier: Tier = profile.tier === "pro" ? "pro" : "free";
  const used = Number(profile.monthly_analysis_count ?? 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-semibold text-ink">요금제</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          분석 횟수는 매월 1일에 리셋됩니다. 결제와 구독 관리는 Polar 호스팅 페이지에서 처리합니다.
        </p>
      </header>

      <CheckoutSuccessWatcher active={fromCheckout} tier={currentTier} />


      <div className="grid max-w-4xl gap-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isPro = plan.id === "pro";

          return (
            <Card className={isPro ? "border-accent" : undefined} key={plan.id}>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
                    {isCurrent ? <Badge>현재 플랜</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">{plan.description}</p>
                </div>
                {isPro ? <span className="text-xs font-semibold text-accent">추천</span> : null}
              </div>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tabular-nums text-ink">{plan.price}</span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>

              <div className="mb-6 rounded-lg border border-line bg-surface-2 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>이번 달 분석</span>
                  <span className="tabular-nums">
                    {currentTier === plan.id ? used : 0}/{plan.limit}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-lg bg-surface-3">
                  <div
                    className="h-full rounded-lg bg-accent"
                    style={{ width: `${Math.min(100, Math.round(((currentTier === plan.id ? used : 0) / plan.limit) * 100))}%` }}
                  />
                </div>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li className="flex gap-2 text-sm text-ink" key={feature}>
                    <svg
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isPro ? (
                <CheckoutButton disabled={isCurrent} />
              ) : (
                <button
                  className="w-full rounded-lg bg-surface-3 px-4 py-2 text-sm font-medium text-muted"
                  disabled
                  type="button"
                >
                  {isCurrent ? "사용 중" : "Free"}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

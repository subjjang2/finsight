import type { ReactNode } from "react";
import { DashboardShell } from "../../components/shell";
import { currentPeriod } from "../../lib/entitlements";
import { createServerClient } from "../../lib/supabase/server";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../../types/tier";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: "free" | "pro" = "free";
  let used = 0;
  let limit = FREE_MONTHLY_LIMIT;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, monthly_analysis_count, count_period")
      .eq("id", user.id)
      .single();

    plan = profile?.tier === "pro" ? "pro" : "free";
    limit = plan === "pro" ? PRO_FAIR_USE_LIMIT : FREE_MONTHLY_LIMIT;
    used =
      profile?.count_period === currentPeriod(new Date())
        ? Number(profile.monthly_analysis_count ?? 0)
        : 0;
  }

  return (
    <DashboardShell limit={limit} plan={plan} used={used}>
      {children}
    </DashboardShell>
  );
}

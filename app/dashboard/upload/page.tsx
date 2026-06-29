import { UploadFlow } from "../../../components/dashboard/UploadFlow";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../../../types/tier";
import { currentPeriod } from "../../../lib/entitlements";
import { createServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let used = 0;
  let limit = FREE_MONTHLY_LIMIT;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, monthly_analysis_count, count_period")
      .eq("id", user.id)
      .single();

    const tier = profile?.tier === "pro" ? "pro" : "free";
    limit = tier === "pro" ? PRO_FAIR_USE_LIMIT : FREE_MONTHLY_LIMIT;
    used = profile?.count_period === currentPeriod(new Date()) ? Number(profile.monthly_analysis_count ?? 0) : 0;
  }

  return <UploadFlow limit={limit} used={used} />;
}

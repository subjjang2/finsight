import type { Tier } from "../types/tier";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../types/tier";

export type AnalysisCountProfile = {
  monthly_analysis_count: number;
  count_period: string | null;
};

export type NextAnalysisCount = {
  monthly_analysis_count: number;
  count_period: string;
};

export function currentPeriod(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function canAnalyze(tier: Tier, count: number): boolean {
  const limit = tier === "pro" ? PRO_FAIR_USE_LIMIT : FREE_MONTHLY_LIMIT;

  return count < limit;
}

export function nextAnalysisCount(profile: AnalysisCountProfile, now: Date): NextAnalysisCount {
  const period = currentPeriod(now);
  const currentCount = profile.count_period === period ? profile.monthly_analysis_count : 0;

  return {
    monthly_analysis_count: currentCount + 1,
    count_period: period,
  };
}

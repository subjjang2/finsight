import { describe, expect, it } from "vitest";
import { canAnalyze, currentPeriod, nextAnalysisCount } from "../lib/entitlements";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../types/tier";

describe("entitlement helpers", () => {
  it("formats the calendar month period as YYYY-MM", () => {
    expect(currentPeriod(new Date("2026-06-29T09:15:00.000Z"))).toBe("2026-06");
    expect(currentPeriod(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
  });

  it("allows analysis below the monthly tier limits only", () => {
    expect(canAnalyze("free", FREE_MONTHLY_LIMIT - 1)).toBe(true);
    expect(canAnalyze("free", FREE_MONTHLY_LIMIT)).toBe(false);
    expect(canAnalyze("pro", PRO_FAIR_USE_LIMIT - 1)).toBe(true);
    expect(canAnalyze("pro", PRO_FAIR_USE_LIMIT)).toBe(false);
  });

  it("increments count inside the same calendar month", () => {
    expect(
      nextAnalysisCount(
        { monthly_analysis_count: 2, count_period: "2026-06" },
        new Date("2026-06-29T12:00:00.000Z"),
      ),
    ).toEqual({ monthly_analysis_count: 3, count_period: "2026-06" });
  });

  it("resets count before incrementing when the calendar month changes", () => {
    expect(
      nextAnalysisCount(
        { monthly_analysis_count: 5, count_period: "2026-05" },
        new Date("2026-06-01T00:00:00.000Z"),
      ),
    ).toEqual({ monthly_analysis_count: 1, count_period: "2026-06" });
  });

  it("treats missing period as a new counting period", () => {
    expect(
      nextAnalysisCount(
        { monthly_analysis_count: 3, count_period: null },
        new Date("2026-06-29T12:00:00.000Z"),
      ),
    ).toEqual({ monthly_analysis_count: 1, count_period: "2026-06" });
  });
});

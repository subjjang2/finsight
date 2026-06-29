import { describe, expect, it } from "vitest";
import { buildInsight, getMeteringDecision } from "../lib/analysis";

describe("buildInsight", () => {
  it("aggregates classified transactions into totals, counts, and category breakdowns", () => {
    expect(
      buildInsight([
        { date: "2026-05-01", merchant: "A", amount: 10000, category: "dining" },
        { date: "2026-05-02", merchant: "B", amount: 2500, category: "cafe" },
        { date: "2026-05-03", merchant: "C", amount: -1000, category: "dining" },
      ]),
    ).toEqual({
      total: 11500,
      count: 3,
      breakdown: [
        { id: "dining", amount: 9000, count: 2 },
        { id: "cafe", amount: 2500, count: 1 },
      ],
      summary: "총 3건, 11,500원 지출을 분석했습니다.",
    });
  });

  it("returns an empty insight for empty transaction input", () => {
    expect(buildInsight([])).toEqual({
      total: 0,
      count: 0,
      breakdown: [],
      summary: "분석할 거래가 없습니다.",
    });
  });
});

describe("getMeteringDecision", () => {
  const now = new Date("2026-06-29T12:00:00.000Z");

  it("allows a free user below the current monthly limit", () => {
    expect(
      getMeteringDecision(
        "free",
        { monthly_analysis_count: 4, count_period: "2026-06" },
        now,
      ),
    ).toEqual({ allowed: true, effectiveCount: 4, limit: 5 });
  });

  it("blocks a free user at the current monthly limit", () => {
    expect(
      getMeteringDecision(
        "free",
        { monthly_analysis_count: 5, count_period: "2026-06" },
        now,
      ),
    ).toEqual({ allowed: false, effectiveCount: 5, limit: 5 });
  });

  it("resets the effective count for a new calendar month before gating", () => {
    expect(
      getMeteringDecision(
        "free",
        { monthly_analysis_count: 5, count_period: "2026-05" },
        now,
      ),
    ).toEqual({ allowed: true, effectiveCount: 0, limit: 5 });
  });
});

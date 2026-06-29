import { describe, expect, it } from "vitest";
import { buildInsight, getMeteringDecision, normalizeTransactionsFromMapping } from "../lib/analysis";
import type { ColumnMapping } from "../types/mapping";

const MAPPING: ColumnMapping[] = [
  { source: "이용일자", sample: "2026.05.02", field: "date", confidence: 1 },
  { source: "가맹점", sample: "스타벅스", field: "merchant", confidence: 1 },
  { source: "금액", sample: "6,300", field: "amount", confidence: 1 },
];
const HEADERS = ["이용일자", "가맹점", "금액"];

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

describe("normalizeTransactionsFromMapping", () => {
  it("normalizes valid rows and skips unparseable footer/summary rows without throwing", () => {
    const rows = [
      ["2026.05.02", "스타벅스 강남R점", "6,300"],
      ["합계", "", "120,000"],
      ["2026.05.04", "쿠팡", "38,900"],
      ["", "", ""],
    ];

    const result = normalizeTransactionsFromMapping(HEADERS, rows, MAPPING);

    expect(result.transactions).toEqual([
      { date: "2026-05-02", merchant: "스타벅스 강남R점", amount: 6300 },
      { date: "2026-05-04", merchant: "쿠팡", amount: 38900 },
    ]);
    expect(result.skipped.map((s) => s.index)).toEqual([1, 3]);
    expect(result.skipped[0].reason).toBeTruthy();
  });

  it("throws when every row fails to normalize", () => {
    const rows = [
      ["합계", "", "120,000"],
      ["안내", "", ""],
    ];

    expect(() => normalizeTransactionsFromMapping(HEADERS, rows, MAPPING)).toThrow(/no valid|유효/i);
  });

  it("still throws when a required mapping field is missing", () => {
    const badMapping: ColumnMapping[] = [
      { source: "이용일자", sample: "2026.05.02", field: "date", confidence: 1 },
      { source: "가맹점", sample: "스타벅스", field: "merchant", confidence: 1 },
    ];

    expect(() => normalizeTransactionsFromMapping(HEADERS, [["2026.05.02", "스타벅스", "6,300"]], badMapping)).toThrow(
      /mapping field/i,
    );
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

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const parseMock = vi.fn();
const anthropicConstructorMock = vi.fn(() => ({
  messages: {
    parse: parseMock,
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: anthropicConstructorMock,
}));

describe("claude service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("maps CSV columns from structured Claude output", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: [
        { source: "이용일자", sample: "2026.05.02", field: "date", confidence: 0.98 },
        { source: "가맹점", sample: "스타벅스", field: "merchant", confidence: 0.95 },
        { source: "금액", sample: "6300", field: "amount", confidence: 0.93 },
        { source: "승인번호", sample: "A001", field: "ignore", confidence: 0.9 },
      ],
    });
    const { mapColumns } = await import("../services/claude");

    await expect(
      mapColumns(
        ["이용일자", "가맹점", "금액", "승인번호"],
        [["2026.05.02", "스타벅스", "6300", "A001"]],
      ),
    ).resolves.toEqual([
      { source: "이용일자", sample: "2026.05.02", field: "date", confidence: 0.98 },
      { source: "가맹점", sample: "스타벅스", field: "merchant", confidence: 0.95 },
      { source: "금액", sample: "6300", field: "amount", confidence: 0.93 },
      { source: "승인번호", sample: "A001", field: "ignore", confidence: 0.9 },
    ]);

    expect(anthropicConstructorMock).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock.mock.calls[0][0]).toMatchObject({
      model: "claude-sonnet-4-6",
      output_config: {
        format: {
          type: "json_schema",
        },
      },
    });
  });

  it("falls back to etc when Claude returns a category outside the fixed enum", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: [{ category: "dining" }, { category: "subscription" }],
    });
    const { classifyTransactions } = await import("../services/claude");

    await expect(
      classifyTransactions([
        { date: "2026-05-02", merchant: "김밥천국", amount: 8000 },
        { date: "2026-05-03", merchant: "Unknown", amount: 12000 },
      ]),
    ).resolves.toEqual([{ category: "dining" }, { category: "etc" }]);

    const schema = parseMock.mock.calls[0][0].output_config.format.schema;
    expect(schema.items.properties.category.enum).toEqual([
      "dining",
      "shopping",
      "grocery",
      "cafe",
      "transport",
      "utilities",
      "leisure",
      "medical",
      "finance",
      "education",
      "travel",
      "etc",
    ]);
  });

  it("propagates Claude failures without retrying", async () => {
    const error = new Error("Claude unavailable");
    parseMock.mockRejectedValueOnce(error);
    const { mapColumns } = await import("../services/claude");

    await expect(mapColumns(["date"], [["2026-05-02"]])).rejects.toThrow("Claude unavailable");
    expect(parseMock).toHaveBeenCalledTimes(1);
  });
});

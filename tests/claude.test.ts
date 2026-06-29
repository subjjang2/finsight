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

    expect(anthropicConstructorMock).toHaveBeenCalledWith({
      apiKey: "test-key",
      timeout: 30_000,
      maxRetries: 1,
    });
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

  it("throws when Claude returns fewer classifications than transactions", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: [{ category: "dining" }],
    });
    const { classifyTransactions } = await import("../services/claude");

    await expect(
      classifyTransactions([
        { date: "2026-05-02", merchant: "김밥천국", amount: 8000 },
        { date: "2026-05-03", merchant: "쿠팡", amount: 12000 },
      ]),
    ).rejects.toThrow(/classification/i);
  });

  it("throws when structured output is not a JSON array", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: { category: "dining" },
    });
    const { classifyTransactions } = await import("../services/claude");

    await expect(
      classifyTransactions([{ date: "2026-05-02", merchant: "김밥천국", amount: 8000 }]),
    ).rejects.toThrow(/array/i);
  });

  it("throws a meaningful error when the text output is not valid JSON", async () => {
    parseMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json at all" }],
    });
    const { classifyTransactions } = await import("../services/claude");

    await expect(
      classifyTransactions([{ date: "2026-05-02", merchant: "김밥천국", amount: 8000 }]),
    ).rejects.toThrow(/json/i);
  });

  it("rejects classification batches larger than the row cap before calling Claude", async () => {
    const { classifyTransactions } = await import("../services/claude");
    const txs = Array.from({ length: 10_001 }, (_, index) => ({
      date: "2026-05-02",
      merchant: `m${index}`,
      amount: 1000,
    }));

    await expect(classifyTransactions(txs)).rejects.toThrow(/10000|limit|too many/i);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("instructs Claude to treat input strictly as data (prompt-injection boundary)", async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: [{ category: "dining" }] });
    const { classifyTransactions } = await import("../services/claude");

    await classifyTransactions([{ date: "2026-05-02", merchant: "김밥천국", amount: 8000 }]);

    expect(parseMock.mock.calls[0][0].system).toMatch(/data/i);
  });

  it("propagates Claude failures without retrying", async () => {
    const error = new Error("Claude unavailable");
    parseMock.mockRejectedValueOnce(error);
    const { mapColumns } = await import("../services/claude");

    await expect(mapColumns(["date"], [["2026-05-02"]])).rejects.toThrow("Claude unavailable");
    expect(parseMock).toHaveBeenCalledTimes(1);
  });
});

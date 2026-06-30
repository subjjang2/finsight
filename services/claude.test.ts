import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const parseMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({ messages: { parse: parseMock } })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

// Regression: the Anthropic structured-output API rejects `minimum`/`maximum`
// on a "number" property ("For 'number' type, properties maximum, minimum are
// not supported"). The column-mapping schema must therefore not declare them;
// confidence is clamped in code instead.
describe("claude column mapping schema", () => {
  it("does not send unsupported minimum/maximum on the confidence number", async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: [] });
    const { mapColumns } = await import("./claude");
    await mapColumns(["거래일자"], [["2026-06-01"]]);

    const schema = parseMock.mock.calls[0][0].output_config.format.schema;
    const confidence = schema.items.properties.confidence;
    expect(confidence.type).toBe("number");
    expect(confidence).not.toHaveProperty("minimum");
    expect(confidence).not.toHaveProperty("maximum");
  });
});

describe("generateSpendingAdvice", () => {
  const input = {
    total: 100000,
    count: 12,
    breakdown: [{ category: "식비", amount: 60000, count: 5 }],
    summary: "이번 달 식비 비중이 높습니다.",
  };

  it("calls the Sonnet model with an object advice schema and returns the advice text", async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: { advice: "식비 비중을 줄여보세요." } });
    const { generateSpendingAdvice } = await import("./claude");

    const advice = await generateSpendingAdvice(input);

    expect(advice).toBe("식비 비중을 줄여보세요.");
    const call = parseMock.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-4-6");
    const schema = call.output_config.format.schema;
    expect(schema.type).toBe("object");
    expect(schema.properties.advice.type).toBe("string");
    // User spending data must be passed as JSON data, never interpolated into the prompt.
    expect(call.messages[0].content).toContain("식비");
  });

  it("falls back to text output when parsed_output is absent", async () => {
    parseMock.mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ advice: "조언입니다." }) }],
    });
    const { generateSpendingAdvice } = await import("./claude");

    await expect(generateSpendingAdvice(input)).resolves.toBe("조언입니다.");
  });

  it("throws when the advice text is empty", async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: { advice: "   " } });
    const { generateSpendingAdvice } = await import("./claude");

    await expect(generateSpendingAdvice(input)).rejects.toThrow();
  });
});

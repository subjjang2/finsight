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

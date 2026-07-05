import { describe, expect, it } from "vitest";
import { readParsedObject, textOf } from "./anthropic";

describe("readParsedObject", () => {
  it("returns parsed_output when present", () => {
    expect(readParsedObject({ parsed_output: { pass: true } })).toEqual({ pass: true });
  });

  it("falls back to parsing a JSON text block", () => {
    const res = { content: [{ type: "text", text: '{"pass":false,"reason":"x"}' }] };
    expect(readParsedObject(res)).toEqual({ pass: false, reason: "x" });
  });

  it("throws when the payload is not a JSON object", () => {
    expect(() => readParsedObject({ parsed_output: [1, 2] })).toThrow(/object/);
  });
});

describe("textOf", () => {
  it("concatenates text blocks", () => {
    const res = { content: [{ type: "text", text: "hello " }, { type: "text", text: "world" }] };
    expect(textOf(res)).toBe("hello world");
  });

  it("returns empty string when there are no text blocks", () => {
    expect(textOf({ content: [] })).toBe("");
  });
});

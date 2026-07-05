import { describe, expect, it } from "vitest";
import { runCase, runEval, type EvalClient } from "./run";
import type { EvalCase } from "./lib/parse";

// 네트워크 없는 스텁: parse 는 subject verdict + judge verdict 를 겸한 객체를,
// create 는 텍스트 답변을 돌려준다.
function stubClient(overrides?: Partial<Record<string, unknown>>): EvalClient {
  return {
    messages: {
      parse: async () => ({
        parsed_output: { verdict: "violation", explanation: "leak", pass: true, reason: "ok", ...overrides },
      }),
      create: async () => ({ content: [{ type: "text", text: "answer" }] }),
    },
  };
}

const reviewCase: EvalCase = {
  track: "review",
  id: "r1",
  file: "r1.md",
  expect: "violation",
  rule: "A2",
  input: "leaks a key",
};

const qaCase: EvalCase = {
  track: "qa",
  id: "q1",
  file: "q1.md",
  must: ["x"],
  mustNot: [],
  falsePremise: false,
  input: "question?",
};

describe("runCase", () => {
  it("returns a passing result when the judge passes", async () => {
    const r = await runCase(stubClient(), reviewCase, "CLAUDE.md");
    expect(r).toMatchObject({ id: "r1", track: "review", pass: true });
  });

  it("captures errors as a failing result", async () => {
    const boom: EvalClient = {
      messages: {
        parse: async () => {
          throw new Error("network down");
        },
        create: async () => ({ content: [] }),
      },
    };
    const r = await runCase(boom, reviewCase, "CLAUDE.md");
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/error:/);
  });
});

describe("runEval", () => {
  it("runs every case and returns one result each", async () => {
    const results = await runEval(stubClient(), [reviewCase, qaCase], "CLAUDE.md");
    expect(results.map((r) => r.id)).toEqual(["r1", "q1"]);
    expect(results.every((r) => r.pass)).toBe(true);
  });
});

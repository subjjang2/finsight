import { describe, expect, it } from "vitest";
import { buildQaJudgePrompt, buildReviewJudgePrompt } from "./judge";
import type { QaCase, ReviewCase } from "./parse";

const reviewCase: ReviewCase = {
  track: "review",
  id: "r1",
  file: "r1.md",
  expect: "violation",
  rule: "A2",
  input: "leaks a key",
};

const qaCase: QaCase = {
  track: "qa",
  id: "q1",
  file: "q1.md",
  must: ["service-role", "webhook"],
  mustNot: ["logged-in user can update tier"],
  falsePremise: true,
  input: "can a user set their own tier?",
};

describe("buildReviewJudgePrompt", () => {
  it("carries the expected label and the reviewer's verdict", () => {
    const { user } = buildReviewJudgePrompt(reviewCase, {
      verdict: "pass",
      explanation: "looks fine",
    });
    expect(user).toContain("violation"); // expected label
    expect(user).toContain("looks fine"); // reviewer output under grading
  });
});

describe("buildQaJudgePrompt", () => {
  it("embeds must / must_not facts", () => {
    const { user } = buildQaJudgePrompt(qaCase, "some answer");
    expect(user).toContain("service-role");
    expect(user).toContain("logged-in user can update tier");
    expect(user).toContain("some answer");
  });

  it("adds a false-premise instruction when the case is flagged", () => {
    const { system } = buildQaJudgePrompt(qaCase, "x");
    expect(system).toMatch(/false premise/i);
  });

  it("omits the false-premise instruction otherwise", () => {
    const { system } = buildQaJudgePrompt({ ...qaCase, falsePremise: false }, "x");
    expect(system).not.toMatch(/false premise/i);
  });
});

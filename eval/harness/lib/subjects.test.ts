import { describe, expect, it } from "vitest";
import { REVIEWER_SYSTEM, responderSystem } from "./subjects";

describe("REVIEWER_SYSTEM", () => {
  it("summarizes the CRITICAL guardrails the reviewer must enforce", () => {
    expect(REVIEWER_SYSTEM).toMatch(/service-role/i);
    expect(REVIEWER_SYSTEM).toMatch(/RLS/);
    expect(REVIEWER_SYSTEM).toMatch(/NEXT_PUBLIC/);
    expect(REVIEWER_SYSTEM).toMatch(/violation/);
  });
});

describe("responderSystem", () => {
  it("embeds the live CLAUDE.md as ground truth and mandates premise correction", () => {
    const sys = responderSystem("## 아키텍처 규칙\nCRITICAL: ...");
    expect(sys).toContain("아키텍처 규칙");
    expect(sys).toMatch(/premise|전제/i);
  });
});

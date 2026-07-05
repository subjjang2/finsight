import { describe, expect, it } from "vitest";
import { parseCase, parseFrontmatter, splitFrontmatter } from "./parse";

describe("splitFrontmatter", () => {
  it("splits the --- block from the body", () => {
    const { frontmatter, body } = splitFrontmatter("---\ntrack: qa\n---\nhello world");
    expect(frontmatter).toBe("track: qa");
    expect(body).toBe("hello world");
  });

  it("throws when the frontmatter block is missing", () => {
    expect(() => splitFrontmatter("no frontmatter here")).toThrow(/frontmatter/);
  });
});

describe("parseFrontmatter", () => {
  it("parses scalars", () => {
    expect(parseFrontmatter("track: review\nid: r1")).toEqual({ track: "review", id: "r1" });
  });

  it("parses block lists under an empty key", () => {
    const fm = parseFrontmatter("must:\n  - alpha\n  - beta");
    expect(fm.must).toEqual(["alpha", "beta"]);
  });

  it("parses inline bracket lists", () => {
    const fm = parseFrontmatter('must: ["a", "b"]');
    expect(fm.must).toEqual(["a", "b"]);
  });

  it("strips surrounding quotes", () => {
    expect(parseFrontmatter('title: "hi there"')).toEqual({ title: "hi there" });
  });
});

describe("parseCase", () => {
  it("parses a review case", () => {
    const md = "---\ntrack: review\nid: r1\nexpect: violation\nrule: A2\n---\nconst x = 1;";
    const c = parseCase("r1.md", md);
    expect(c).toMatchObject({ track: "review", id: "r1", expect: "violation", rule: "A2" });
    expect(c.input).toBe("const x = 1;");
  });

  it("parses a qa case with must/must_not and false_premise", () => {
    const md =
      "---\ntrack: qa\nid: q1\nfalse_premise: true\nmust:\n  - service-role\nmust_not:\n  - authenticated\n---\nquestion?";
    const c = parseCase("q1.md", md);
    if (c.track !== "qa") throw new Error("expected qa");
    expect(c.must).toEqual(["service-role"]);
    expect(c.mustNot).toEqual(["authenticated"]);
    expect(c.falsePremise).toBe(true);
  });

  it("rejects an invalid review expect", () => {
    const md = "---\ntrack: review\nid: r1\nexpect: maybe\n---\nx";
    expect(() => parseCase("r1.md", md)).toThrow(/expect/);
  });

  it("rejects a qa case with no must facts", () => {
    const md = "---\ntrack: qa\nid: q1\n---\nquestion?";
    expect(() => parseCase("q1.md", md)).toThrow(/must/);
  });

  it("rejects an empty body", () => {
    const md = "---\ntrack: review\nid: r1\nexpect: pass\n---\n   ";
    expect(() => parseCase("r1.md", md)).toThrow(/body/);
  });

  it("rejects an unknown track", () => {
    const md = "---\ntrack: bogus\nid: x\n---\nbody";
    expect(() => parseCase("x.md", md)).toThrow(/track/);
  });
});

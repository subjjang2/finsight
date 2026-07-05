import { describe, expect, it } from "vitest";
import { aggregate, formatHtmlReport, formatReport, type CaseResult } from "./aggregate";

const sample: CaseResult[] = [
  { id: "review-01", track: "review", pass: true, reason: "flagged A2" },
  { id: "review-05", track: "review", pass: false, reason: "false positive" },
  { id: "qa-01", track: "qa", pass: true, reason: "all facts present" },
];

describe("aggregate", () => {
  it("counts totals and per-track tallies", () => {
    const s = aggregate(sample);
    expect(s.total).toBe(3);
    expect(s.passed).toBe(2);
    expect(s.failed).toBe(1);
    expect(s.byTrack.review).toEqual({ total: 2, passed: 1, failed: 1 });
    expect(s.byTrack.qa).toEqual({ total: 1, passed: 1, failed: 0 });
  });

  it("returns exitCode 1 when any case fails (regression gate)", () => {
    expect(aggregate(sample).exitCode).toBe(1);
    expect(aggregate(sample).failures.map((f) => f.id)).toEqual(["review-05"]);
  });

  it("returns exitCode 0 when everything passes", () => {
    const s = aggregate([{ id: "a", track: "qa", pass: true, reason: "ok" }]);
    expect(s.exitCode).toBe(0);
    expect(s.failures).toEqual([]);
  });

  it("handles an empty result set as passing", () => {
    expect(aggregate([]).exitCode).toBe(0);
  });
});

describe("formatHtmlReport", () => {
  it("produces a self-contained document with the result and case ids", () => {
    const s = aggregate(sample);
    const html = formatHtmlReport(s, sample, { subject: "sonnet", judge: "opus" });
    expect(html).toMatch(/^<!doctype html/i);
    expect(html).toContain("실패"); // 실패 케이스 판정 라벨(한국어)
    expect(html).toContain("review-05");
  });

  it("renders Korean case detail from case metadata when provided", () => {
    const s = aggregate(sample);
    const html = formatHtmlReport(s, sample, { subject: "sonnet", judge: "opus" }, [
      { track: "review", id: "review-01", file: "r.md", expect: "violation", rule: "A2", title: "키 노출", input: "leaks" },
      { track: "review", id: "review-05", file: "r.md", expect: "pass", title: "정상 코드", input: "fine" },
      { track: "qa", id: "qa-01", file: "q.md", must: ["service-role"], mustNot: [], falsePremise: false, title: "환경변수", input: "how?" },
    ]);
    expect(html).toContain("입력 스니펫");
    expect(html).toContain("채점 기준");
    expect(html).toContain("위반이어야 함");
    expect(html).toContain("정상이어야 함");
    expect(html).toContain("service-role");
  });

  it("escapes HTML in reasons to prevent broken markup", () => {
    const s = aggregate([{ id: "x", track: "qa", pass: false, reason: "<script>alert(1)</script>" }]);
    const html = formatHtmlReport(s, [{ id: "x", track: "qa", pass: false, reason: "<script>alert(1)</script>" }], {
      subject: "s",
      judge: "j",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("formatReport", () => {
  it("includes verdicts, a failures section, and escapes pipes", () => {
    const s = aggregate(sample);
    const md = formatReport(s, sample, { subject: "sonnet", judge: "opus" });
    expect(md).toContain("**FAIL**");
    expect(md).toContain("## failures");
    expect(md).toContain("review-05");
  });
});

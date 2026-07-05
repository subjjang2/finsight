// Golden-set 무결성/균형 검사. 키·네트워크 없이 npm test 로 돈다.
// 라벨은 사람이 박제하고, 이 테스트는 셋의 "모양"만 지킨다:
//   review 트랙 = 위반 4+ / 정상(오탐 방지) 1+, qa 트랙 = 틀린 전제 반박 가드 1+.
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadCases, type QaCase, type ReviewCase } from "./parse";

const CASES_DIR = fileURLToPath(new URL("../cases", import.meta.url));
const cases = loadCases(CASES_DIR);
const review = cases.filter((c): c is ReviewCase => c.track === "review");
const qa = cases.filter((c): c is QaCase => c.track === "qa");

describe("golden set integrity", () => {
  it("loads without parse errors", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it("has unique case ids", () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every case a non-empty input body", () => {
    for (const c of cases) expect(c.input.trim().length).toBeGreaterThan(0);
  });
});

describe("review track balance", () => {
  it("has at least 4 violation cases", () => {
    expect(review.filter((c) => c.expect === "violation").length).toBeGreaterThanOrEqual(4);
  });

  it("has at least 1 compliant case as a false-positive guard", () => {
    expect(review.filter((c) => c.expect === "pass").length).toBeGreaterThanOrEqual(1);
  });

  it("labels every review case with a rule for traceability", () => {
    for (const c of review) expect(c.rule, `${c.id} missing rule`).toBeTruthy();
  });
});

describe("qa track balance", () => {
  it("has at least 3 qa cases", () => {
    expect(qa.length).toBeGreaterThanOrEqual(3);
  });

  it("includes at least 1 false-premise rebuttal guard", () => {
    expect(qa.filter((c) => c.falsePremise).length).toBeGreaterThanOrEqual(1);
  });

  it("gives every qa case at least one must-fact", () => {
    for (const c of qa) expect(c.must.length, `${c.id} has no must fact`).toBeGreaterThan(0);
  });
});

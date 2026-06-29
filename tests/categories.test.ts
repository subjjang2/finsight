import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS, categoryLabel, isCategory } from "../lib/categories";
import { FREE_MONTHLY_LIMIT, MAX_ROWS_PER_UPLOAD, PRO_FAIR_USE_LIMIT } from "../types/tier";

describe("category helpers", () => {
  it("keeps the fixed 12 category ids in PRD order", () => {
    expect(CATEGORY_IDS).toEqual([
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
    expect(CATEGORIES).toHaveLength(12);
  });

  it("keeps Korean labels aligned with the product category set", () => {
    expect(CATEGORIES).toEqual([
      { id: "dining", label: "식비" },
      { id: "shopping", label: "쇼핑" },
      { id: "grocery", label: "마트·생필품" },
      { id: "cafe", label: "카페·간식" },
      { id: "transport", label: "교통" },
      { id: "utilities", label: "주거·통신" },
      { id: "leisure", label: "문화·여가" },
      { id: "medical", label: "의료·건강" },
      { id: "finance", label: "보험·금융" },
      { id: "education", label: "교육" },
      { id: "travel", label: "여행·숙박" },
      { id: "etc", label: "기타" },
    ]);
  });

  it("narrows strings to Category only for fixed category ids", () => {
    expect(isCategory("dining")).toBe(true);
    expect(isCategory("etc")).toBe(true);
    expect(isCategory("other")).toBe(false);
    expect(isCategory("")).toBe(false);
  });

  it("returns the Korean label for a category id", () => {
    expect(categoryLabel("finance")).toBe("보험·금융");
    expect(categoryLabel("etc")).toBe("기타");
  });
});

describe("tier limits", () => {
  it("matches MVP usage limits", () => {
    expect(FREE_MONTHLY_LIMIT).toBe(5);
    expect(PRO_FAIR_USE_LIMIT).toBe(200);
    expect(MAX_ROWS_PER_UPLOAD).toBe(1000);
  });
});

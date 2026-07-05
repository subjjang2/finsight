import { describe, it, expect } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("allows public crawling but blocks private routes", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule?.allow).toBe("/");
    const disallow = rule?.disallow ?? [];
    expect(disallow).toContain("/dashboard/");
    expect(disallow).toContain("/api/");
  });

  it("points to the sitemap", () => {
    const r = robots();
    expect(String(r.sitemap)).toContain("/sitemap.xml");
  });
});

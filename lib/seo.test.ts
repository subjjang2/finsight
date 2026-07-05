import { describe, it, expect } from "vitest";
import {
  siteUrl,
  absoluteUrl,
  softwareApplicationJsonLd,
  SITE_KEYWORDS,
  SITE_NAME,
} from "./seo";

describe("seo", () => {
  it("siteUrl has no trailing slash", () => {
    expect(siteUrl().endsWith("/")).toBe(false);
    expect(siteUrl()).toMatch(/^https?:\/\//);
  });

  it("absoluteUrl joins paths with and without leading slash", () => {
    expect(absoluteUrl("/sitemap.xml")).toBe(`${siteUrl()}/sitemap.xml`);
    expect(absoluteUrl("robots.txt")).toBe(`${siteUrl()}/robots.txt`);
    expect(absoluteUrl()).toBe(`${siteUrl()}/`);
  });

  it("keywords are non-empty and unique", () => {
    expect(SITE_KEYWORDS.length).toBeGreaterThan(0);
    expect(new Set(SITE_KEYWORDS).size).toBe(SITE_KEYWORDS.length);
  });

  it("softwareApplicationJsonLd describes the app", () => {
    const ld = softwareApplicationJsonLd();
    expect(ld["@type"]).toBe("SoftwareApplication");
    expect(ld.name).toBe(SITE_NAME);
    expect(String(ld.url)).toContain(siteUrl());
    expect(ld.applicationCategory).toBe("FinanceApplication");
  });
});

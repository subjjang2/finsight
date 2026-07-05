import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { absoluteUrl } from "../lib/seo";

describe("sitemap", () => {
  it("lists the homepage with an absolute url", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(absoluteUrl("/"));
    urls.forEach((u) => expect(u).toMatch(/^https?:\/\//));
  });

  it("gives the homepage top priority", () => {
    const home = sitemap().find((e) => e.url === absoluteUrl("/"));
    expect(home?.priority).toBe(1);
  });
});

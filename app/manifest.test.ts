import { describe, it, expect } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("declares the app identity and start url", () => {
    const m = manifest();
    expect(m.name).toContain("finsight");
    expect(m.short_name).toBe("finsight");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("ships at least one icon", () => {
    const m = manifest();
    expect(m.icons?.length).toBeGreaterThan(0);
  });
});

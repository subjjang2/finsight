import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("parses KEY=value lines and strips quotes", () => {
    const dir = mkdtempSync(join(tmpdir(), "eval-env-"));
    const file = join(dir, ".env.local");
    writeFileSync(file, 'ANTHROPIC_API_KEY="sk-test"\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n# comment\n');
    const env = loadEnv(file);
    expect(env.ANTHROPIC_API_KEY).toBe("sk-test");
    expect(env.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("returns an empty object when the file is missing", () => {
    expect(loadEnv(join(tmpdir(), "does-not-exist-xyz", ".env.local"))).toEqual({});
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { E2E_COOKIE } from "./lib/e2e";

// The middleware E2E branch must gate /dashboard and /login purely from the
// e2e session cookie, with no Supabase network call.
beforeEach(() => {
  process.env.E2E_LOCAL = "1";
});

afterEach(() => {
  delete process.env.E2E_LOCAL;
});

async function run(path: string, authed: boolean) {
  const { middleware } = await import("./middleware");
  const req = new NextRequest(new URL(`http://localhost${path}`));
  if (authed) {
    req.cookies.set(E2E_COOKIE, "1");
  }
  return middleware(req);
}

describe("middleware E2E gating", () => {
  it("redirects unauthenticated dashboard access to /login", async () => {
    const res = await run("/dashboard", false);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("lets authenticated users reach the dashboard", async () => {
    const res = await run("/dashboard", true);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from /login", async () => {
    const res = await run("/login", true);
    expect(res.headers.get("location")).toContain("/dashboard");
  });
});

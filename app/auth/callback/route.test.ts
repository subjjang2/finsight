import { describe, it, expect, vi, beforeEach } from "vitest";

const exchangeCodeForSession = vi.fn();

vi.mock("../../../lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

import { GET } from "./route";

// The request URL host behind Railway's proxy is the internal container address
// (localhost:8080), so redirects must be built from NEXT_PUBLIC_SITE_URL, not
// from requestUrl.origin — otherwise OAuth lands the user on localhost:8080.
function req(url: string) {
  return new Request(url) as unknown as Parameters<typeof GET>[0];
}

describe("auth callback redirect host", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://finsight-production-3957.up.railway.app";
  });

  it("redirects to the public site host on success, not the internal request origin", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(req("https://localhost:8080/auth/callback?code=abc&next=%2Fdashboard"));
    expect(res.headers.get("location")).toBe(
      "https://finsight-production-3957.up.railway.app/dashboard",
    );
  });

  it("redirects to /login on missing code using the public site host", async () => {
    const res = await GET(req("https://localhost:8080/auth/callback"));
    expect(res.headers.get("location")).toBe(
      "https://finsight-production-3957.up.railway.app/login",
    );
  });

  it("redirects to /login on exchange error using the public site host", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("boom") });
    const res = await GET(req("https://localhost:8080/auth/callback?code=bad"));
    expect(res.headers.get("location")).toBe(
      "https://finsight-production-3957.up.railway.app/login",
    );
  });
});

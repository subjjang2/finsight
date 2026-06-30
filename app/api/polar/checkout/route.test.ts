import { describe, it, expect, vi, beforeEach } from "vitest";

const { createPolarCheckoutUrl, getUser, single } = vi.hoisted(() => ({
  createPolarCheckoutUrl: vi.fn(),
  getUser: vi.fn(),
  single: vi.fn(),
}));
vi.mock("../../../../lib/billing/checkout", () => ({ createPolarCheckoutUrl }));

vi.mock("../../../../lib/supabase/server", () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
  })),
}));

import { POST } from "./route";

function req(url: string) {
  return new Request(url, {
    method: "POST",
    headers: { accept: "application/json" },
  });
}

describe("polar checkout origin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://finsight-production-3957.up.railway.app";
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "e@x.com" } } });
    single.mockResolvedValue({ data: { tier: "free" }, error: null });
    createPolarCheckoutUrl.mockResolvedValue("https://sandbox.polar.sh/checkout/abc");
  });

  it("passes the public site URL as origin, not the internal request host (localhost:8080)", async () => {
    const res = await POST(req("https://localhost:8080/api/polar/checkout"));
    expect(createPolarCheckoutUrl).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "https://finsight-production-3957.up.railway.app" }),
    );
    expect(res.status).toBe(200);
  });
});

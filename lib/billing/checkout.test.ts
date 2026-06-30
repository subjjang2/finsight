import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPolarCheckoutUrl } from "./checkout";

const USER_ID = "9d48d512-1ec5-45e8-b75d-3e1e93cfe817";

function mockCheckoutFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ url: "https://checkout.example/session" }),
  } as Response);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("createPolarCheckoutUrl — API base URL", () => {
  beforeEach(() => {
    process.env.POLAR_ACCESS_TOKEN = "polar_token";
    process.env.POLAR_PRO_PRODUCT_ID = "prod_pro";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.POLAR_ACCESS_TOKEN;
    delete process.env.POLAR_PRO_PRODUCT_ID;
    delete process.env.POLAR_API_BASE;
  });

  it("calls the production Polar API by default", async () => {
    const fetchMock = mockCheckoutFetch();

    await createPolarCheckoutUrl({ userId: USER_ID, email: "a@b.test", origin: "https://app.test" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.polar.sh/v1/checkouts/");
  });

  it("targets the sandbox host when POLAR_API_BASE is set", async () => {
    process.env.POLAR_API_BASE = "https://sandbox-api.polar.sh";
    const fetchMock = mockCheckoutFetch();

    await createPolarCheckoutUrl({ userId: USER_ID, email: "a@b.test", origin: "https://app.test" });

    expect(fetchMock.mock.calls[0][0]).toBe("https://sandbox-api.polar.sh/v1/checkouts/");
  });
});

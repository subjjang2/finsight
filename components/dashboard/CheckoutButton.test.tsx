import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The button imports the analytics client (posthog-js). Mock it so importing the
// module tree never touches the real browser SDK. The click-time track() call is
// covered by lib/analytics/client.test.ts.
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import { CheckoutButton } from "./CheckoutButton";

describe("CheckoutButton", () => {
  it("submits to the Polar checkout endpoint", () => {
    const html = renderToStaticMarkup(<CheckoutButton disabled={false} />);
    expect(html).toContain('action="/api/polar/checkout"');
    expect(html).toContain("업그레이드");
  });

  it("renders a disabled button for the current plan", () => {
    const html = renderToStaticMarkup(<CheckoutButton disabled />);
    expect(html).toContain("disabled");
    expect(html).toContain("사용 중");
  });
});

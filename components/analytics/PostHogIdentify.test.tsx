import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { identify: vi.fn() } }));

import { PostHogIdentify } from "./PostHogIdentify";

describe("PostHogIdentify", () => {
  // Identify runs in a useEffect (client-only); the render itself is a null-rendering
  // side-effect component. The identify logic is covered by lib/analytics/client.test.ts.
  it("renders nothing", () => {
    const html = renderToStaticMarkup(<PostHogIdentify userId="u1" tier="pro" />);
    expect(html).toBe("");
  });
});

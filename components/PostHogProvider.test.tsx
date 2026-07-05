import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";

vi.mock("posthog-js", () => ({
  default: { init: vi.fn() },
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { PostHogProvider } from "./PostHogProvider";

describe("PostHogProvider", () => {
  it("renders children", () => {
    const html = renderToStaticMarkup(
      <PostHogProvider>
        <div>content</div>
      </PostHogProvider>,
    );
    expect(html).toContain("content");
  });
});

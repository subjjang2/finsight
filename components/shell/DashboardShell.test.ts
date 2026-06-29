import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("../../app/(auth)/login/actions", () => ({
  signOut: async () => {},
}));

import { DashboardShell } from "./DashboardShell";

describe("DashboardShell", () => {
  it("injects real plan/usage values into the sidebar meter", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        DashboardShell,
        { plan: "free", used: 3, limit: 5 },
        React.createElement("p", null, "본문"),
      ),
    );

    expect(markup).toContain("3/5");
    expect(markup).toContain("본문");
  });

  it("exposes a mobile menu trigger and responsive breakpoints", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        DashboardShell,
        { plan: "pro", used: 0, limit: 200 },
        React.createElement("p", null, "본문"),
      ),
    );

    expect(markup).toContain('aria-label="메뉴 열기"');
    expect(markup).toContain("lg:hidden");
    expect(markup).toContain("lg:flex");
  });
});

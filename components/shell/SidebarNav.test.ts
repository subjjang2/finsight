import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/trend",
}));

import { SidebarNav } from "./SidebarNav";

describe("SidebarNav", () => {
  it("marks the active nav item from the current pathname", () => {
    const markup = renderToStaticMarkup(React.createElement(SidebarNav));

    expect(markup).toContain('href="/dashboard/trend"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("bg-surface-2 text-ink");
  });

  it("does not mark the insights root active on a nested route", () => {
    const markup = renderToStaticMarkup(React.createElement(SidebarNav));
    // /dashboard should not be active when pathname is /dashboard/trend
    const insightsActive = markup.match(/href="\/dashboard"[^>]*aria-current="page"/);
    expect(insightsActive).toBeNull();
  });
});

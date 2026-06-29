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

import { Sidebar } from "./Sidebar";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../../types/tier";

describe("Sidebar", () => {
  it("derives the usage limit label from tier constants", () => {
    const pro = renderToStaticMarkup(
      React.createElement(Sidebar, { plan: "pro", used: 12, limit: PRO_FAIR_USE_LIMIT }),
    );
    const free = renderToStaticMarkup(
      React.createElement(Sidebar, { plan: "free", used: 1, limit: FREE_MONTHLY_LIMIT }),
    );

    expect(pro).toContain(`월 ${PRO_FAIR_USE_LIMIT}건`);
    expect(free).toContain(`월 ${FREE_MONTHLY_LIMIT}건`);
  });

  it("renders the injected usage values", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Sidebar, { plan: "free", used: 3, limit: FREE_MONTHLY_LIMIT }),
    );

    expect(markup).toContain(`3/${FREE_MONTHLY_LIMIT}`);
  });
});

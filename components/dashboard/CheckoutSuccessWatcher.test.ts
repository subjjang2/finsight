import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, replace: () => {}, push: () => {} }),
}));

import { CheckoutSuccessWatcher } from "./CheckoutSuccessWatcher";

// Effects (the polling timer) need a DOM and aren't exercised here; renderToStaticMarkup
// covers the initial server-rendered state, which is what the user first sees on return.
describe("CheckoutSuccessWatcher", () => {
  it("renders nothing when not returning from checkout", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutSuccessWatcher, { active: false, tier: "free" }),
    );
    expect(markup).toBe("");
  });

  it("shows the confirming banner when back from checkout but still free", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutSuccessWatcher, { active: true, tier: "free" }),
    );
    expect(markup).toContain("결제 확인 중");
  });

  it("shows the success banner once the tier is already pro", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutSuccessWatcher, { active: true, tier: "pro" }),
    );
    expect(markup).toContain("활성화");
  });
});

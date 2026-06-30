import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckoutStatusBanner } from "./CheckoutStatusBanner";

describe("CheckoutStatusBanner", () => {
  it("renders nothing when idle", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutStatusBanner, { status: "idle" }),
    );
    expect(markup).toBe("");
  });

  it("shows a confirming state while the webhook is settling", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutStatusBanner, { status: "confirming" }),
    );
    expect(markup).toContain("결제 확인 중");
    // status=loading region must be announced for assistive tech
    expect(markup).toContain('role="status"');
  });

  it("confirms the upgrade on success", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutStatusBanner, { status: "success" }),
    );
    expect(markup).toContain("Pro");
    expect(markup).toContain("활성화");
  });

  it("offers an explicit retry when the wait times out", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CheckoutStatusBanner, { status: "timeout", onRetry: () => {} }),
    );
    expect(markup).toContain("다시 확인");
    expect(markup).toContain("<button");
  });
});

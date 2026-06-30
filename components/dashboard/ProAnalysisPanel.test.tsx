import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProAnalysisPanel, proAnalysisInitialView } from "./ProAnalysisPanel";

describe("proAnalysisInitialView", () => {
  it("locks the panel for free-tier users", () => {
    expect(proAnalysisInitialView("free", null)).toBe("locked");
    expect(proAnalysisInitialView("free", "이미 생성된 조언")).toBe("locked");
  });

  it("shows the idle state for Pro users without a cached result", () => {
    expect(proAnalysisInitialView("pro", null)).toBe("idle");
    expect(proAnalysisInitialView("pro", "   ")).toBe("idle");
  });

  it("shows the result state for Pro users with cached advice", () => {
    expect(proAnalysisInitialView("pro", "외식을 줄여보세요.")).toBe("result");
  });
});

describe("ProAnalysisPanel", () => {
  it("renders the locked upsell with an upgrade button for free users", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProAnalysisPanel, { plan: "free", initialAdvice: null, hasInsight: true }),
    );

    expect(markup).toContain("Pro 분석 잠금");
    expect(markup).toContain("Pro로 업그레이드");
  });

  it("renders the generate action for Pro users without cached advice", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProAnalysisPanel, { plan: "pro", initialAdvice: null, hasInsight: true }),
    );

    expect(markup).toContain("분석 생성하기");
    expect(markup).not.toContain("Pro로 업그레이드");
  });

  it("renders cached advice for Pro users", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProAnalysisPanel, {
        plan: "pro",
        initialAdvice: "외식 비중이 높습니다. 식비를 줄여보세요.",
        hasInsight: true,
      }),
    );

    expect(markup).toContain("외식 비중이 높습니다. 식비를 줄여보세요.");
    expect(markup).toContain("다시 생성");
  });

  it("disables generation when there is no insight", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ProAnalysisPanel, { plan: "pro", initialAdvice: null, hasInsight: false }),
    );

    expect(markup).toContain("분석할 명세서가 없습니다");
  });
});

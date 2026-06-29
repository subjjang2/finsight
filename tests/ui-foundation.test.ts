import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Select,
  Stat,
  SuccessState,
} from "../components/ui";

describe("ui foundation primitives", () => {
  it("uses finsight dark tokens for card and form primitives", () => {
    const card = renderToStaticMarkup(React.createElement(Card, null, "내용"));
    const input = renderToStaticMarkup(
      React.createElement(Input, { "aria-label": "검색" }),
    );
    const select = renderToStaticMarkup(
      React.createElement(
        Select,
        { "aria-label": "월" },
        React.createElement("option", null, "2026-06"),
      ),
    );

    expect(card).toContain("rounded-lg");
    expect(card).toContain("bg-surface");
    expect(card).toContain("border-line");
    expect(input).toContain("bg-surface-2");
    expect(input).toContain("border-line");
    expect(select).toContain("bg-surface-2");
  });

  it("renders button variants without banned rounded-2xl styling", () => {
    const primary = renderToStaticMarkup(
      React.createElement(Button, null, "저장"),
    );
    const accent = renderToStaticMarkup(
      React.createElement(Button, { variant: "accent" }, "분석"),
    );
    const text = renderToStaticMarkup(
      React.createElement(Button, { variant: "text" }, "취소"),
    );

    expect(primary).toContain("bg-white");
    expect(accent).toContain("bg-accent");
    expect(text).toContain("text-muted");
    expect(`${primary}${accent}${text}`).not.toContain("rounded-2xl");
  });

  it("provides distinct data states and tabular stat values", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(LoadingState, { label: "불러오는 중" }),
        React.createElement(ErrorState, {
          title: "오류",
          message: "다시 시도하세요.",
        }),
        React.createElement(EmptyState, {
          title: "데이터 없음",
          message: "CSV를 업로드하세요.",
        }),
        React.createElement(SuccessState, {
          title: "완료",
          message: "분석이 끝났습니다.",
        }),
        React.createElement(Stat, { label: "총 지출", value: "₩120,000" }),
        React.createElement(Badge, null, "Free"),
      ),
    );

    expect(markup).toContain("불러오는 중");
    expect(markup).toContain("오류");
    expect(markup).toContain("데이터 없음");
    expect(markup).toContain("완료");
    expect(markup).toContain("tabular-nums");
    expect(markup).toContain("Free");
  });
});

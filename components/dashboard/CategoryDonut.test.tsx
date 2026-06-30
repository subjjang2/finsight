import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CategoryDonut, donutSegments, emeraldScale } from "./CategoryDonut";

describe("emeraldScale", () => {
  it("returns the brightest emerald for the top rank", () => {
    expect(emeraldScale(0, 4)).toBe("oklch(62% 0.16 165)");
  });

  it("fades lightness and chroma toward neutral for lower ranks", () => {
    expect(emeraldScale(3, 4)).toBe("oklch(36% 0.025 165)");
  });

  it("uses the brightest color when there is a single segment", () => {
    expect(emeraldScale(0, 1)).toBe("oklch(62% 0.16 165)");
  });
});

describe("donutSegments", () => {
  const rows = [
    { id: "dining" as const, amount: 60 },
    { id: "transport" as const, amount: 40 },
  ];

  it("emits one segment per positive row", () => {
    expect(donutSegments(rows, 100, 168)).toHaveLength(2);
  });

  it("excludes zero and negative amounts", () => {
    const withEmpty = [...rows, { id: "etc" as const, amount: 0 }];
    expect(donutSegments(withEmpty, 100, 168)).toHaveLength(2);
  });

  it("starts the first arc at offset 0 and stacks subsequent arcs", () => {
    const segments = donutSegments(rows, 100, 168);
    const circumference = 2 * Math.PI * (168 / 2 - 14);

    expect(segments[0].offset).toBe(0);
    // second arc is offset by the first arc's fraction (60%)
    expect(segments[1].offset).toBeCloseTo(-0.6 * circumference, 5);
  });

  it("sizes each dash to the row's fraction of the total", () => {
    const segments = donutSegments(rows, 100, 168);
    const circumference = 2 * Math.PI * (168 / 2 - 14);

    expect(segments[0].length).toBeCloseTo(0.6 * circumference, 5);
    expect(segments[1].length).toBeCloseTo(0.4 * circumference, 5);
  });

  it("returns no segments when the total is not positive", () => {
    expect(donutSegments(rows, 0, 168)).toHaveLength(0);
  });
});

describe("CategoryDonut", () => {
  const rows = [
    { id: "dining" as const, amount: 60000, count: 3 },
    { id: "transport" as const, amount: 40000, count: 5 },
  ];

  it("renders an svg donut with one arc per category", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CategoryDonut, { rows, total: 100000 }),
    );

    expect(markup).toContain("<svg");
    // one background track + two value arcs
    expect(markup.match(/<circle/g) ?? []).toHaveLength(3);
  });

  it("labels each category with its share and amount in the legend", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CategoryDonut, { rows, total: 100000 }),
    );

    expect(markup).toContain("식비");
    expect(markup).toContain("교통");
    expect(markup).toContain("60.0%");
    expect(markup).toContain("₩60,000");
  });

  it("shows the total spend in the center of the donut", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CategoryDonut, { rows, total: 100000 }),
    );

    expect(markup).toContain("₩100,000");
  });
});

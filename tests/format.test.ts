import { describe, expect, it } from "vitest";
import { formatMonth, pct, won, wonShort, yyyyMmDd } from "../lib/format";

describe("format helpers", () => {
  it("formats KRW amounts with won prefix and tabular-friendly separators", () => {
    expect(won(2647300)).toBe("₩2,647,300");
    expect(won("12000.50")).toBe("₩12,001");
    expect(won(null)).toBe("₩0");
  });

  it("formats compact won values and percentages", () => {
    expect(wonShort(2647300)).toBe("264.7만");
    expect(wonShort(9000)).toBe("9,000");
    expect(pct(25, 200)).toBe("12.5%");
    expect(pct(25, 0)).toBe("0.0%");
  });

  it("formats dates and months as product copy expects", () => {
    expect(yyyyMmDd("2026-06-29T12:30:00Z")).toBe("2026-06-29");
    expect(formatMonth("2026-06-29T12:30:00Z")).toBe("2026-06");
    expect(yyyyMmDd(null)).toBe("-");
  });
});

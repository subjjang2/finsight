import { describe, it, expect } from "vitest";
import { applyDiscount } from "./demo-discount";

// 임시: 경량 AI 리뷰 확인용. 검증 후 폐기.
describe("demo-discount", () => {
  it("함수를 export 한다", () => {
    expect(typeof applyDiscount).toBe("function");
  });
});

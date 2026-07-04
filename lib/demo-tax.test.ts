import { describe, it, expect } from "vitest";
import { priceWithTax } from "./demo-tax";

// 임시: ai-review 자동 트리거 검증용. 검증 후 폐기.
describe("demo-tax", () => {
  it("함수를 export 한다", () => {
    expect(typeof priceWithTax).toBe("function");
  });
});

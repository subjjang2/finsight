import { describe, it, expect, vi } from "vitest";

// ImageResponse는 런타임 렌더러라 유닛 테스트에서 실제 실행하지 않는다.
// 파일 컨벤션이 요구하는 export(size/contentType/alt)와 default 시그니처만 검증한다.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor() {}
  },
}));

import * as og from "./opengraph-image";

describe("opengraph-image", () => {
  it("exports a 1200x630 png spec", () => {
    expect(og.size).toEqual({ width: 1200, height: 630 });
    expect(og.contentType).toBe("image/png");
    expect(typeof og.alt).toBe("string");
    expect(typeof og.default).toBe("function");
  });
});

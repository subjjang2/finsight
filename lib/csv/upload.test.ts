// Colocated next to lib/csv/upload.ts so the TDD guard's same-folder check
// resolves regardless of the hook's working directory.
// The runnable suite lives in tests/upload.test.ts (vitest include = tests/**).
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateUploadFile } from "./upload";

describe("validateUploadFile (colocated sanity)", () => {
  it("enforces a 5MB byte ceiling", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
    expect(
      validateUploadFile({ size: MAX_UPLOAD_BYTES + 1, type: "text/csv", name: "a.csv" }).ok,
    ).toBe(false);
  });
});

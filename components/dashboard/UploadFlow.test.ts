import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

import { validateCsvFile, MAX_UPLOAD_BYTES } from "./UploadFlow";

function fakeFile(props: Partial<{ name: string; type: string; size: number }>): File {
  return {
    name: props.name ?? "statement.csv",
    type: props.type ?? "text/csv",
    size: props.size ?? 2048,
  } as unknown as File;
}

describe("validateCsvFile", () => {
  it("accepts a normal csv file", () => {
    expect(validateCsvFile(fakeFile({})).ok).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    expect(validateCsvFile(fakeFile({ name: "report.pdf", type: "application/pdf" })).ok).toBe(false);
  });

  it("accepts an .xlsx file even with an empty content type", () => {
    expect(validateCsvFile(fakeFile({ name: "statement.xlsx", type: "" })).ok).toBe(true);
  });

  it("accepts a legacy .xls file", () => {
    expect(
      validateCsvFile(fakeFile({ name: "이용대금명세서.xls", type: "application/vnd.ms-excel" })).ok,
    ).toBe(true);
  });

  it("rejects files over the 5MB server limit", () => {
    expect(validateCsvFile(fakeFile({ size: MAX_UPLOAD_BYTES + 1 })).ok).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateCsvFile(fakeFile({ size: 0 })).ok).toBe(false);
  });
});

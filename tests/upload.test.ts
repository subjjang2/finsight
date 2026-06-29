import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  validateUploadFile,
} from "../lib/csv/upload";

describe("validateUploadFile", () => {
  it("accepts a normal-sized CSV file", () => {
    expect(
      validateUploadFile({ size: 1024, type: "text/csv", name: "statement.csv" }),
    ).toEqual({ ok: true });
  });

  it("rejects an empty file", () => {
    expect(
      validateUploadFile({ size: 0, type: "text/csv", name: "statement.csv" }),
    ).toEqual({
      ok: false,
      status: 400,
      message: "빈 파일은 업로드할 수 없습니다.",
    });
  });

  it("rejects a file larger than the 5MB limit", () => {
    expect(
      validateUploadFile({
        size: MAX_UPLOAD_BYTES + 1,
        type: "text/csv",
        name: "statement.csv",
      }),
    ).toEqual({
      ok: false,
      status: 413,
      message: "파일 크기는 5MB를 초과할 수 없습니다.",
    });
  });

  it("accepts a file exactly at the 5MB limit", () => {
    expect(
      validateUploadFile({
        size: MAX_UPLOAD_BYTES,
        type: "text/csv",
        name: "statement.csv",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a non-CSV content type", () => {
    expect(
      validateUploadFile({
        size: 1024,
        type: "application/pdf",
        name: "statement.pdf",
      }),
    ).toEqual({
      ok: false,
      status: 415,
      message: "CSV 파일만 업로드할 수 있습니다.",
    });
  });

  it("accepts a .csv file even when the browser sends an empty content type", () => {
    expect(
      validateUploadFile({ size: 1024, type: "", name: "statement.csv" }),
    ).toEqual({ ok: true });
  });

  it("rejects a non-csv extension when content type is missing", () => {
    expect(
      validateUploadFile({ size: 1024, type: "", name: "statement.xlsx" }),
    ).toEqual({
      ok: false,
      status: 415,
      message: "CSV 파일만 업로드할 수 있습니다.",
    });
  });

  it("exposes a 5MB byte limit", () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});

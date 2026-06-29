import { describe, expect, it } from "vitest";
import { decodeBuffer } from "../lib/csv/decode";
import { parseCsv } from "../lib/csv/parse";
import { extractSample, normalizeAmount, normalizeDate } from "../lib/csv/normalize";
import { MAX_ROWS_PER_UPLOAD } from "../types/tier";

const EUC_KR_SAMPLE = Uint8Array.from([
  192, 204, 191, 235, 192, 207, 192, 218, 44, 176, 161, 184, 205, 193, 161, 44,
  192, 204, 191, 235, 177, 221, 190, 215, 40, 191, 248, 41, 13, 10, 50, 48, 50,
  54, 46, 48, 53, 46, 48, 50, 44, 189, 186, 197, 184, 185, 247, 189, 186, 32,
  176, 173, 179, 178, 82, 193, 161, 44, 34, 54, 44, 51, 48, 48, 34, 13, 10,
]);

describe("decodeBuffer", () => {
  it("decodes EUC-KR card statement bytes without corrupting Korean text", () => {
    expect(decodeBuffer(EUC_KR_SAMPLE)).toBe(
      '이용일자,가맹점,이용금액(원)\r\n2026.05.02,스타벅스 강남R점,"6,300"\r\n',
    );
  });

  it("decodes UTF-8 with BOM", () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...Buffer.from("이용일자,금액\n", "utf8")]);

    expect(decodeBuffer(bytes)).toBe("이용일자,금액\n");
  });

  it("falls back without throwing when bytes are valid in neither UTF-8 nor EUC-KR", () => {
    const bytes = Uint8Array.from([0xff, 0xfe, 0x00, 0x41, 0x80, 0x81]);

    expect(() => decodeBuffer(bytes)).not.toThrow();
    expect(typeof decodeBuffer(bytes)).toBe("string");
  });
});

describe("parseCsv", () => {
  it("parses quoted fields, escaped quotes, and CRLF line endings", () => {
    const csv = 'date,merchant,amount\r\n2026.05.02,"A, B Store","6,300"\r\n2026.05.03,"He said ""hi""",4800\r\n';

    expect(parseCsv(csv)).toEqual({
      headers: ["date", "merchant", "amount"],
      rows: [
        ["2026.05.02", "A, B Store", "6,300"],
        ["2026.05.03", 'He said "hi"', "4800"],
      ],
    });
  });

  it("treats a quote inside an unquoted field as a literal (RFC 4180)", () => {
    const csv = 'date,merchant,amount\r\n2026.05.02,55" TV 매장,120000\r\n2026.05.03,정상가맹점,4800\r\n';

    expect(parseCsv(csv)).toEqual({
      headers: ["date", "merchant", "amount"],
      rows: [
        ["2026.05.02", '55" TV 매장', "120000"],
        ["2026.05.03", "정상가맹점", "4800"],
      ],
    });
  });

  it("handles characters that follow a closing quote without breaking the row", () => {
    const csv = 'date,merchant,amount\r\n2026.05.02,"A, B"점,4800\r\n';

    expect(parseCsv(csv)).toEqual({
      headers: ["date", "merchant", "amount"],
      rows: [["2026.05.02", "A, B점", "4800"]],
    });
  });

  it("throws when row count exceeds MAX_ROWS_PER_UPLOAD", () => {
    const rows = Array.from({ length: MAX_ROWS_PER_UPLOAD + 1 }, (_, index) => `2026-05-${String((index % 28) + 1).padStart(2, "0")},가맹점,1000`);
    const csv = ["date,merchant,amount", ...rows].join("\n");

    expect(() => parseCsv(csv)).toThrow(/1000/);
  });
});

describe("normalizeAmount", () => {
  it("normalizes Korean won strings with comma and currency markers", () => {
    expect(normalizeAmount("6,300")).toBe(6300);
    expect(normalizeAmount("₩6,300")).toBe(6300);
    expect(normalizeAmount("6,300원")).toBe(6300);
  });

  it("handles negative and refund-style amount markers", () => {
    expect(normalizeAmount("-6,300")).toBe(-6300);
    expect(normalizeAmount("(6,300)")).toBe(-6300);
    expect(normalizeAmount("6,300 환불")).toBe(-6300);
  });

  it("treats a trailing minus sign as a negative amount", () => {
    expect(normalizeAmount("6,300-")).toBe(-6300);
    expect(normalizeAmount("6300-")).toBe(-6300);
    expect(normalizeAmount("₩6,300-")).toBe(-6300);
  });

  it("throws on non-numeric amounts", () => {
    expect(() => normalizeAmount("금액없음")).toThrow(/amount/i);
  });
});

describe("normalizeDate", () => {
  it("normalizes common card statement date formats", () => {
    expect(normalizeDate("2026.05.02")).toBe("2026-05-02");
    expect(normalizeDate("2026-05-02")).toBe("2026-05-02");
    expect(normalizeDate("2026/05/02")).toBe("2026-05-02");
  });

  it("accepts a date with a trailing time suffix", () => {
    expect(normalizeDate("2026-05-02 13:45")).toBe("2026-05-02");
    expect(normalizeDate("2026.05.02 13:45:30")).toBe("2026-05-02");
    expect(normalizeDate("2026-05-02T13:45")).toBe("2026-05-02");
  });

  it("accepts the compact YYYYMMDD format", () => {
    expect(normalizeDate("20260502")).toBe("2026-05-02");
  });

  it("throws on invalid dates", () => {
    expect(() => normalizeDate("2026.02.30")).toThrow(/date/i);
    expect(() => normalizeDate("not a date")).toThrow(/date/i);
    expect(() => normalizeDate("20261302")).toThrow(/date/i);
  });
});

describe("extractSample", () => {
  it("returns non-empty trimmed values from a target column", () => {
    const rows = [
      ["2026.05.02", "스타벅스 강남R점", "6,300"],
      ["2026.05.03", " ", "4,800"],
      ["2026.05.04", "쿠팡", "38,900"],
    ];

    expect(extractSample(rows, 1, 2)).toEqual(["스타벅스 강남R점", "쿠팡"]);
  });
});

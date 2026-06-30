import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseStatement } from "./statement";
import { normalizeDate } from "./normalize";
import { MAX_ROWS_PER_UPLOAD } from "../../types/tier";

function csvBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function excelBytes(
  aoa: unknown[][],
  bookType: "xlsx" | "xls",
  opts: { cellDates?: boolean } = {},
): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: opts.cellDates });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const out = XLSX.write(wb, { type: "array", bookType }) as ArrayBuffer;
  return new Uint8Array(out);
}

describe("parseStatement", () => {
  it("parses plain CSV bytes identically to the text path (regression)", () => {
    const result = parseStatement(csvBytes("date,merchant,amount\n2026-01-02,Cafe,1000\n"));
    expect(result.headers).toEqual(["date", "merchant", "amount"]);
    expect(result.rows).toEqual([["2026-01-02", "Cafe", "1000"]]);
  });

  it("does not misdetect a leading-text CSV as Excel", () => {
    // PK / OLE magic must not false-trigger on ordinary CSV content.
    const result = parseStatement(csvBytes("PKid,merchant,amount\n2026-01-02,Cafe,1000\n"));
    expect(result.headers[0]).toBe("PKid");
  });

  it("parses an .xlsx workbook (first sheet) into headers + rows", () => {
    const bytes = excelBytes(
      [
        ["date", "merchant", "amount"],
        ["2026-01-02", "Cafe", "1,000"],
        ["2026-01-03", "Mart", "2,500"],
      ],
      "xlsx",
    );
    const result = parseStatement(bytes);
    expect(result.headers).toEqual(["date", "merchant", "amount"]);
    expect(result.rows).toEqual([
      ["2026-01-02", "Cafe", "1,000"],
      ["2026-01-03", "Mart", "2,500"],
    ]);
  });

  it("parses a legacy .xls (BIFF) workbook", () => {
    const bytes = excelBytes(
      [
        ["date", "merchant", "amount"],
        ["2026-02-02", "Shop", "3,000"],
      ],
      "xls",
    );
    expect(bytes[0]).toBe(0xd0); // OLE2 magic
    const result = parseStatement(bytes);
    expect(result.headers).toEqual(["date", "merchant", "amount"]);
    expect(result.rows[0]).toEqual(["2026-02-02", "Shop", "3,000"]);
  });

  it("emits real date cells as YYYY-MM-DD that normalizeDate accepts", () => {
    const bytes = excelBytes(
      [
        ["거래일자", "가맹점명", "이용금액"],
        [new Date(Date.UTC(2026, 5, 30)), "카페", "1000"],
      ],
      "xlsx",
      { cellDates: true },
    );
    const result = parseStatement(bytes);
    const dateCell = result.rows[0][0];
    expect(dateCell).toBe("2026-06-30");
    expect(normalizeDate(dateCell)).toBe("2026-06-30");
  });

  it("locates the transaction header below a Korean statement preamble", () => {
    const bytes = excelBytes(
      [
        ["이용대금 명세서"],
        ["결제정보", "", "", "", "", "", "출금일", "", "", "결제금액"],
        ["개별계좌", "", "", "", "", "", "2026.07.07", "", "", "1,582,455"],
        ["이용상세내역"],
        ["총건수", "52", "결제금액", "1,582,455"],
        ["거래일자", "가맹점명", "이용금액", "할부 기간"],
        ["2026.05.31", "기본연회비", "8,000", "-"],
        ["2026.06.15", "쿠팡", "87,980", "4"],
      ],
      "xlsx",
    );
    const result = parseStatement(bytes);
    expect(result.headers.slice(0, 3)).toEqual(["거래일자", "가맹점명", "이용금액"]);
    expect(result.rows[0].slice(0, 3)).toEqual(["2026.05.31", "기본연회비", "8,000"]);
    expect(result.rows[1].slice(0, 3)).toEqual(["2026.06.15", "쿠팡", "87,980"]);
  });

  it("throws when an Excel data region exceeds the row limit", () => {
    const aoa: unknown[][] = [["date", "merchant", "amount"]];
    for (let i = 0; i < MAX_ROWS_PER_UPLOAD + 1; i += 1) {
      aoa.push(["2026-01-02", "Cafe", "1000"]);
    }
    expect(() => parseStatement(excelBytes(aoa, "xlsx"))).toThrow();
  });

  it("throws on an empty Excel sheet", () => {
    expect(() => parseStatement(excelBytes([[]], "xlsx"))).toThrow();
  });
});

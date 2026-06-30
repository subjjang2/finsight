import * as XLSX from "xlsx";
import { MAX_ROWS_PER_UPLOAD } from "../../types/tier";
import { decodeBuffer } from "./decode";
import { parseCsv, type ParsedCsv } from "./parse";

// Header keyword sets for Korean card/bank statements. A real transaction header
// row contains a date, a merchant, AND an amount column at once — summary/title
// rows in the preamble never satisfy all three, so this reliably skips them.
const DATE_TOKENS = ["거래일자", "이용일자", "매출일자", "승인일자", "사용일자", "거래일", "이용일", "날짜", "일자", "출금일"];
const MERCHANT_TOKENS = ["가맹점명", "가맹점", "이용하신곳", "이용내용", "사용처", "상호", "내용"];
const AMOUNT_TOKENS = ["이용금액", "승인금액", "매출금액", "결제금액", "사용금액", "거래금액", "금액"];

/**
 * Parse an uploaded statement (CSV, .xlsx, or legacy .xls) into the shared
 * { headers, rows } shape. Format is detected by magic bytes — not the file
 * name — so the upload route and the analysis re-parse (which only has the
 * stored bytes) stay consistent.
 */
export function parseStatement(bytes: Uint8Array): ParsedCsv {
  if (isExcel(bytes)) {
    return parseExcel(bytes);
  }

  return parseCsv(decodeBuffer(bytes));
}

function isExcel(bytes: Uint8Array): boolean {
  // OLE2 compound document (.xls): D0 CF 11 E0
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  // ZIP container (.xlsx): 50 4B 03 04 ("PK\x03\x04"). The trailing 03 04 keeps
  // ordinary text starting with "PK" from being misdetected.
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  return isOle || isZip;
}

function parseExcel(bytes: Uint8Array): ParsedCsv {
  // cellDates+UTC → real date cells come back as UTC Date objects (no timezone drift);
  // we format those to YYYY-MM-DD ourselves below. Text dates (the common Korean .xls
  // case, e.g. "2026.05.31") pass through unchanged.
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true, UTC: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;

  if (!sheet) {
    throw new Error("엑셀 파일에 시트가 없습니다.");
  }

  const grid = XLSX.utils
    .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: true, defval: "" })
    .map((row) => row.map(formatCell));

  const records = grid.filter((row) => row.some((cell) => cell !== ""));

  if (records.length === 0) {
    throw new Error("엑셀 파일에 데이터가 없습니다.");
  }

  const headerIndex = findHeaderRow(records);
  const headers = records[headerIndex].map((header) => header.trim());
  const rows = records.slice(headerIndex + 1);

  if (rows.length > MAX_ROWS_PER_UPLOAD) {
    throw new Error(`행 수가 ${MAX_ROWS_PER_UPLOAD}개 제한을 초과했습니다.`);
  }

  return { headers, rows };
}

// Excel cells are typed (string/number/Date). Dates become YYYY-MM-DD (matches
// normalizeDate); everything else becomes its trimmed string form (numbers like
// 1000 → "1000", which normalizeAmount handles alongside "1,089,000" text cells).
function formatCell(cell: unknown): string {
  if (cell instanceof Date) {
    const year = cell.getUTCFullYear();
    const month = String(cell.getUTCMonth() + 1).padStart(2, "0");
    const day = String(cell.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return String(cell ?? "").trim();
}

// Returns the index of the transaction-table header row, or 0 (treat the first
// row as the header, like a clean CSV) when no keyword header is found.
function findHeaderRow(records: string[][]): number {
  for (let index = 0; index < records.length; index += 1) {
    const cells = records[index].map((cell) => cell.replace(/\s/g, ""));
    const hasDate = cells.some((cell) => DATE_TOKENS.some((token) => cell.includes(token)));
    const hasMerchant = cells.some((cell) => MERCHANT_TOKENS.some((token) => cell.includes(token)));
    const hasAmount = cells.some((cell) => AMOUNT_TOKENS.some((token) => cell.includes(token)));

    if (hasDate && hasMerchant && hasAmount) {
      return index;
    }
  }

  return 0;
}

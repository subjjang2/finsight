import { MAX_ROWS_PER_UPLOAD } from "../../types/tier";

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const records = parseRecords(text);
  const nonEmptyRecords = records.filter((record) => record.some((field) => field.trim() !== ""));

  if (nonEmptyRecords.length === 0) {
    throw new Error("CSV must include a header row.");
  }

  const [headers, ...rows] = nonEmptyRecords;

  if (rows.length > MAX_ROWS_PER_UPLOAD) {
    throw new Error(`CSV row count exceeds the ${MAX_ROWS_PER_UPLOAD} row limit.`);
  }

  return {
    headers: headers.map((header) => header.trim()),
    rows,
  };
}

function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }

      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      record.push(field);
      field = "";
      continue;
    }

    if (char === "\r" || char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";

      if (char === "\r" && next === "\n") {
        index += 1;
      }

      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new Error("CSV contains an unterminated quoted field.");
  }

  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

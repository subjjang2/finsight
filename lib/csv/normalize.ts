export function normalizeAmount(raw: string): number {
  const value = raw.trim();
  // Sign detection is kept separate from digit extraction so that a leading or
  // trailing minus, parentheses, or refund markers are all recognised.
  const isNegative =
    value.startsWith("-") ||
    /-\s*$/.test(value) ||
    /^\(.+\)$/.test(value) ||
    /환불|취소|차감/i.test(value);
  const normalized = value
    .replace(/[₩원,\s()]/g, "")
    .replace(/환불|취소|차감/gi, "")
    .replace(/^[+-]+/, "")
    .replace(/[+-]+$/, "");

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid amount: ${raw}`);
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid amount: ${raw}`);
  }

  return isNegative ? -amount : amount;
}

export function normalizeDate(raw: string): string {
  // Drop an optional time suffix ("2026-05-02 13:45", "2026.05.02T13:45:30").
  const value = raw.trim().replace(/[ T]\d{1,2}:\d{2}(:\d{2})?.*$/, "").trim();
  const match =
    /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(value) ??
    /^(\d{4})(\d{2})(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid date: ${raw}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid date: ${raw}`);
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractSample(rows: string[][], colIndex: number, n: number): string[] {
  if (!Number.isInteger(colIndex) || colIndex < 0) {
    throw new Error(`Invalid column index: ${colIndex}`);
  }

  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Invalid sample count: ${n}`);
  }

  const sample: string[] = [];

  for (const row of rows) {
    const value = row[colIndex]?.trim();

    if (value) {
      sample.push(value);
    }

    if (sample.length >= n) {
      break;
    }
  }

  return sample;
}

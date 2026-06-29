const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

export function decodeBuffer(buf: Uint8Array): string {
  const bytes = stripUtf8Bom(buf);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Not valid UTF-8 — try EUC-KR (common for Korean card statements).
  }

  try {
    return new TextDecoder("euc-kr", { fatal: true }).decode(bytes);
  } catch {
    // Neither encoding matched cleanly. Fall back to a non-fatal UTF-8 decode so
    // a single bad byte never aborts the whole upload; undecodable bytes become
    // the Unicode replacement character instead of throwing.
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

function stripUtf8Bom(buf: Uint8Array): Uint8Array {
  if (buf.length >= 3 && buf[0] === UTF8_BOM[0] && buf[1] === UTF8_BOM[1] && buf[2] === UTF8_BOM[2]) {
    return buf.slice(3);
  }

  return buf;
}

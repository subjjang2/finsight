const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

export function decodeBuffer(buf: Uint8Array): string {
  const bytes = stripUtf8Bom(buf);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("euc-kr", { fatal: true }).decode(bytes);
  }
}

function stripUtf8Bom(buf: Uint8Array): Uint8Array {
  if (buf.length >= 3 && buf[0] === UTF8_BOM[0] && buf[1] === UTF8_BOM[1] && buf[2] === UTF8_BOM[2]) {
    return buf.slice(3);
  }

  return buf;
}

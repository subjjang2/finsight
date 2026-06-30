import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

const { getUserMock, uploadMock, singleMock, mapColumnsMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  uploadMock: vi.fn(),
  singleMock: vi.fn(),
  mapColumnsMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createServerClient: async () => ({
    auth: { getUser: getUserMock },
    storage: { from: () => ({ upload: uploadMock }) },
    from: () => ({ insert: () => ({ select: () => ({ single: singleMock }) }) }),
  }),
}));

vi.mock("../../../services/claude", () => ({
  mapColumns: mapColumnsMock,
}));

import { POST } from "./route";

function xlsxFile(aoa: unknown[][]): File {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);

  return new File([bytes], "statement.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function postRequest(file: File): Request {
  const form = new FormData();
  form.append("file", file);

  return new Request("http://test/api/uploads", { method: "POST", body: form });
}

describe("POST /api/uploads (Excel support)", () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    uploadMock.mockResolvedValue({ error: null });
    singleMock.mockResolvedValue({ data: { id: "upload-1" }, error: null });
    mapColumnsMock.mockResolvedValue([
      { source: "거래일자", field: "date", sample: "2026-01-02", confidence: 0.9 },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses an uploaded .xlsx file into headers + mapping", async () => {
    const file = xlsxFile([
      ["거래일자", "가맹점명", "이용금액"],
      ["2026-01-02", "카페", "1,000"],
    ]);

    const response = await POST(postRequest(file));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.headers).toEqual(["거래일자", "가맹점명", "이용금액"]);
    expect(body.rowCount).toBe(1);
    expect(body.uploadId).toBe("upload-1");
    // The raw bytes are handed to storage; mapping runs on the parsed sample.
    expect(mapColumnsMock).toHaveBeenCalledOnce();
  });

  it("rejects an unauthenticated request before parsing", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await POST(postRequest(xlsxFile([["a", "b"]])));

    expect(response.status).toBe(401);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("../../../lib/supabase/server", () => ({
  createServerClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("../../../services/claude", () => ({
  classifyTransactions: vi.fn(),
}));

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://test/api/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyses (guards before parsing)", () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const response = await POST(jsonRequest({ uploadId: "u1", mapping: [] }));

    expect(response.status).toBe(401);
  });

  it("rejects a missing uploadId", async () => {
    const response = await POST(jsonRequest({ mapping: [] }));

    expect(response.status).toBe(400);
  });

  it("rejects an invalid column mapping", async () => {
    const response = await POST(jsonRequest({ uploadId: "u1", mapping: "nope" }));

    expect(response.status).toBe(400);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock, generateSpendingAdviceMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  generateSpendingAdviceMock: vi.fn(),
}));

vi.mock("../../../lib/supabase/server", () => ({
  createServerClient: createServerClientMock,
}));

vi.mock("../../../services/claude", () => ({
  generateSpendingAdvice: generateSpendingAdviceMock,
}));

import { POST } from "./route";

type InsightFixture = {
  id: string;
  total: number;
  tx_count: number;
  breakdown: unknown;
  summary: string | null;
  advice: string | null;
  advice_generated_at: string | null;
};

// Minimal chainable Supabase query-builder stub: every method is chainable, and
// terminal reads (single/maybeSingle) plus awaited writes resolve to the
// configured result.
function chain(results: { single?: unknown; maybeSingle?: unknown; awaited?: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    update: () => builder,
    single: async () => results.single,
    maybeSingle: async () => results.maybeSingle,
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(results.awaited ?? { error: null }).then(resolve, reject),
  };
  return builder;
}

function fakeSupabase({
  user,
  tier,
  insight,
}: {
  user: { id: string } | null;
  tier?: string;
  insight?: InsightFixture | null;
}) {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) => {
      if (table === "profiles") {
        return chain({ single: { data: tier ? { tier } : null, error: tier ? null : { message: "no profile" } } });
      }
      // insights: read (maybeSingle) for lookup, awaited result for the update.
      return chain({ maybeSingle: { data: insight ?? null, error: null }, awaited: { error: null } });
    },
  };
}

function jsonRequest(body: unknown): Request {
  return new Request("http://test/api/advice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const insightFixture: InsightFixture = {
  id: "insight-1",
  total: 100000,
  tx_count: 12,
  breakdown: [{ id: "dining", amount: 60000, count: 5 }],
  summary: "식비 비중이 높습니다.",
  advice: null,
  advice_generated_at: null,
};

describe("POST /api/advice", () => {
  beforeEach(() => {
    generateSpendingAdviceMock.mockResolvedValue("외식을 줄여보세요.");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an unauthenticated request", async () => {
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: null }));

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(401);
    expect(generateSpendingAdviceMock).not.toHaveBeenCalled();
  });

  it("rejects a free-tier user with 403", async () => {
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: { id: "u1" }, tier: "free", insight: insightFixture }));

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(403);
    expect(generateSpendingAdviceMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the Pro user has no insight to analyze", async () => {
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: { id: "u1" }, tier: "pro", insight: null }));

    const response = await POST(jsonRequest({}));

    expect(response.status).toBe(404);
    expect(generateSpendingAdviceMock).not.toHaveBeenCalled();
  });

  it("generates and returns advice for a Pro user without a cached result", async () => {
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: { id: "u1" }, tier: "pro", insight: insightFixture }));

    const response = await POST(jsonRequest({}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.advice).toBe("외식을 줄여보세요.");
    expect(body.cached).toBe(false);
    expect(generateSpendingAdviceMock).toHaveBeenCalledTimes(1);
  });

  it("returns the cached advice without calling Claude", async () => {
    const cached = { ...insightFixture, advice: "이미 저장된 조언입니다." };
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: { id: "u1" }, tier: "pro", insight: cached }));

    const response = await POST(jsonRequest({}));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.advice).toBe("이미 저장된 조언입니다.");
    expect(body.cached).toBe(true);
    expect(generateSpendingAdviceMock).not.toHaveBeenCalled();
  });

  it("regenerates advice when the cooldown has elapsed", async () => {
    const cached = {
      ...insightFixture,
      advice: "오래된 조언입니다.",
      advice_generated_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    };
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: { id: "u1" }, tier: "pro", insight: cached }));

    const response = await POST(jsonRequest({ regenerate: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.advice).toBe("외식을 줄여보세요.");
    expect(generateSpendingAdviceMock).toHaveBeenCalledTimes(1);
  });

  it("rate-limits regeneration within the cooldown window with 429", async () => {
    const cached = {
      ...insightFixture,
      advice: "방금 생성한 조언입니다.",
      advice_generated_at: new Date().toISOString(),
    };
    createServerClientMock.mockResolvedValue(fakeSupabase({ user: { id: "u1" }, tier: "pro", insight: cached }));

    const response = await POST(jsonRequest({ regenerate: true }));

    expect(response.status).toBe(429);
    expect(generateSpendingAdviceMock).not.toHaveBeenCalled();
  });
});

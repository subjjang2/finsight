import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  E2E_COOKIE,
  TEST_USER,
  createFakeSupabaseClient,
  e2eRouteDecision,
  isE2E,
  resetE2EStore,
} from "./e2e";

const originalFlag = process.env.E2E_LOCAL;

beforeEach(() => {
  resetE2EStore();
});

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.E2E_LOCAL;
  } else {
    process.env.E2E_LOCAL = originalFlag;
  }
});

describe("isE2E", () => {
  it("is true only when E2E_LOCAL=1", () => {
    process.env.E2E_LOCAL = "1";
    expect(isE2E()).toBe(true);
    process.env.E2E_LOCAL = "0";
    expect(isE2E()).toBe(false);
    delete process.env.E2E_LOCAL;
    expect(isE2E()).toBe(false);
  });
});

describe("e2eRouteDecision", () => {
  it("redirects unauthenticated dashboard access to login", () => {
    expect(e2eRouteDecision("/dashboard", false)).toBe("login");
    expect(e2eRouteDecision("/dashboard/upload", false)).toBe("login");
  });

  it("redirects authenticated login access to dashboard", () => {
    expect(e2eRouteDecision("/login", true)).toBe("dashboard");
  });

  it("passes through otherwise", () => {
    expect(e2eRouteDecision("/dashboard", true)).toBeNull();
    expect(e2eRouteDecision("/login", false)).toBeNull();
  });
});

describe("fake supabase auth", () => {
  it("returns the test user when authed", async () => {
    const client = createFakeSupabaseClient({ authed: true });
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe(TEST_USER.id);
  });

  it("returns no user when not authed", async () => {
    const client = createFakeSupabaseClient({ authed: false });
    const { data } = await client.auth.getUser();
    expect(data.user).toBeNull();
  });
});

describe("fake supabase data layer", () => {
  it("seeds a free-tier profile for the test user", async () => {
    const client = createFakeSupabaseClient({ authed: true });
    const { data } = await client
      .from("profiles")
      .select("tier, monthly_analysis_count, count_period")
      .eq("id", TEST_USER.id)
      .single();
    expect(data?.tier).toBe("free");
    expect(data?.monthly_analysis_count).toBe(0);
  });

  it("inserts an upload and reads it back by id", async () => {
    const client = createFakeSupabaseClient({ authed: true });
    const { data: inserted } = await client
      .from("uploads")
      .insert({
        user_id: TEST_USER.id,
        file_name: "card.csv",
        row_count: 3,
        column_mapping: [],
        storage_path: "p/1.csv",
      })
      .select("id")
      .single();
    expect(typeof inserted?.id).toBe("string");

    const { data: found } = await client
      .from("uploads")
      .select("id, storage_path")
      .eq("id", inserted!.id)
      .eq("user_id", TEST_USER.id)
      .single();
    expect(found?.storage_path).toBe("p/1.csv");
  });

  it("returns the latest insight ordered by created_at", async () => {
    const client = createFakeSupabaseClient({ authed: true });
    await client.from("insights").insert({
      user_id: TEST_USER.id,
      upload_id: "u1",
      total: 100,
      tx_count: 2,
      breakdown: [],
      summary: "old",
      created_at: "2026-01-01T00:00:00.000Z",
    });
    await client.from("insights").insert({
      user_id: TEST_USER.id,
      upload_id: "u2",
      total: 200,
      tx_count: 4,
      breakdown: [],
      summary: "new",
      created_at: "2026-02-01T00:00:00.000Z",
    });

    const { data } = await client
      .from("insights")
      .select("id, upload_id, total, summary, created_at")
      .eq("user_id", TEST_USER.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    expect(data?.summary).toBe("new");
  });

  it("updates a profile row matched by id", async () => {
    const client = createFakeSupabaseClient({ authed: true });
    await client
      .from("profiles")
      .update({ monthly_analysis_count: 3, count_period: "2026-06" })
      .eq("id", TEST_USER.id);

    const { data } = await client
      .from("profiles")
      .select("monthly_analysis_count, count_period")
      .eq("id", TEST_USER.id)
      .single();
    expect(data?.monthly_analysis_count).toBe(3);
    expect(data?.count_period).toBe("2026-06");
  });
});

describe("fake supabase storage", () => {
  it("round-trips an uploaded file", async () => {
    const client = createFakeSupabaseClient({ authed: true });
    const file = new File(["a,b\n1,2"], "card.csv", { type: "text/csv" });
    const { error } = await client.storage.from("card-statements").upload("p/x.csv", file, {});
    expect(error).toBeNull();

    const { data } = await client.storage.from("card-statements").download("p/x.csv");
    const text = new TextDecoder().decode(new Uint8Array(await data!.arrayBuffer()));
    expect(text).toBe("a,b\n1,2");
  });
});

describe("E2E cookie constant", () => {
  it("is a stable non-empty name", () => {
    expect(E2E_COOKIE).toBe("e2e_session");
  });
});

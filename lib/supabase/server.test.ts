import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_USER } from "../e2e";

// In E2E mode createServerClient must return the in-memory fake client (no real
// Supabase network/env required) and report auth based on the e2e session cookie.
const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll: () => [...cookieJar.entries()].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
  }),
}));

beforeEach(() => {
  cookieJar.clear();
  process.env.E2E_LOCAL = "1";
});

afterEach(() => {
  delete process.env.E2E_LOCAL;
  vi.resetModules();
});

describe("createServerClient in E2E mode", () => {
  it("returns a fake client reporting no user without the session cookie", async () => {
    const { createServerClient } = await import("./server");
    const client = await createServerClient();
    const { data } = await client.auth.getUser();
    expect(data.user).toBeNull();
  });

  it("reports the test user when the e2e session cookie is set", async () => {
    cookieJar.set("e2e_session", "1");
    const { createServerClient } = await import("./server");
    const client = await createServerClient();
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe(TEST_USER.id);
  });
});

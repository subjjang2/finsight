import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPostAuthRedirectPath,
  validateAuthCredentials,
} from "../../../lib/auth/validation";

// In E2E mode authenticate must accept ANY credentials: set the e2e session cookie
// and redirect, without touching Supabase. signOut must clear the cookie.
const cookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("../../../lib/supabase/server", () => ({
  createServerClient: async () => {
    throw new Error("Supabase must not be called in E2E mode");
  },
}));

beforeEach(() => {
  cookieStore.set.mockClear();
  cookieStore.delete.mockClear();
  process.env.E2E_LOCAL = "1";
});

afterEach(() => {
  delete process.env.E2E_LOCAL;
  vi.resetModules();
});

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe("authenticate in E2E mode", () => {
  it("accepts any credentials, sets the cookie and redirects to next", async () => {
    const { authenticate } = await import("./actions");
    await expect(
      authenticate(
        { status: "idle", message: "", mode: "login" },
        form({ mode: "login", next: "/dashboard", email: "x", password: "y" }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard");
    expect(cookieStore.set).toHaveBeenCalledWith(
      "e2e_session",
      "1",
      expect.objectContaining({ path: "/" }),
    );
  });
});

describe("signOut in E2E mode", () => {
  it("clears the cookie and redirects to /login", async () => {
    const { signOut } = await import("./actions");
    await expect(signOut()).rejects.toThrow("REDIRECT:/login");
    expect(cookieStore.delete).toHaveBeenCalledWith("e2e_session");
  });
});

// The `authenticate` server action is exercised end-to-end above; here we pin the
// pure building blocks it composes (credential validation + redirect resolution),
// which is the logic that actually has branches worth guarding.
describe("login action building blocks", () => {
  it("rejects weak credentials before any auth call", () => {
    expect(
      validateAuthCredentials({ email: "user@example.com", password: "short" }).ok,
    ).toBe(false);
  });

  it("accepts valid credentials", () => {
    const result = validateAuthCredentials({
      email: "User@Example.com",
      password: "longenough",
    });
    expect(result).toEqual({
      ok: true,
      email: "user@example.com",
      password: "longenough",
    });
  });

  it("keeps post-auth redirects on the dashboard", () => {
    expect(getPostAuthRedirectPath("https://evil.example/phish")).toBe("/dashboard");
    expect(getPostAuthRedirectPath("/dashboard/uploads")).toBe("/dashboard/uploads");
  });
});

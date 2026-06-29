import { describe, expect, it } from "vitest";
import {
  getPostAuthRedirectPath,
  validateAuthCredentials,
} from "../lib/auth/validation";

describe("auth validation", () => {
  it("accepts email and password credentials for login", () => {
    expect(
      validateAuthCredentials({
        email: "user@example.com",
        password: "password123",
      }),
    ).toEqual({
      ok: true,
      email: "user@example.com",
      password: "password123",
    });
  });

  it("rejects malformed email addresses", () => {
    expect(
      validateAuthCredentials({
        email: "not-an-email",
        password: "password123",
      }),
    ).toEqual({
      ok: false,
      message: "이메일 형식을 확인해 주세요.",
    });
  });

  it("rejects short passwords", () => {
    expect(
      validateAuthCredentials({
        email: "user@example.com",
        password: "12345",
      }),
    ).toEqual({
      ok: false,
      message: "비밀번호는 6자 이상이어야 합니다.",
    });
  });
});

describe("auth redirect paths", () => {
  it("keeps authenticated users on the dashboard by default", () => {
    expect(getPostAuthRedirectPath(null)).toBe("/dashboard");
  });

  it("allows same-origin relative dashboard redirects", () => {
    expect(getPostAuthRedirectPath("/dashboard/uploads")).toBe(
      "/dashboard/uploads",
    );
  });

  it("rejects external redirect targets", () => {
    expect(getPostAuthRedirectPath("https://example.com/phishing")).toBe(
      "/dashboard",
    );
  });
});

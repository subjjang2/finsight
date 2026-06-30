import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({
  authenticate: async (state: unknown) => state,
  signInWithGoogle: async () => undefined,
}));

import { LoginForm } from "./login-form";

const markup = renderToStaticMarkup(
  React.createElement(LoginForm, { next: "/dashboard" }),
);

describe("LoginForm", () => {
  it("uses tab semantics for the login/signup toggle", () => {
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain("aria-selected");
  });

  it("offers a Google sign-in button alongside email/password", () => {
    expect(markup).toContain("Google로 계속하기");
    // The Google button forwards the validated next target.
    expect(markup).toContain('value="/dashboard"');
  });

  it("uses design tokens instead of raw tailwind palette classes", () => {
    expect(markup).not.toContain("border-neutral-800");
    expect(markup).not.toContain("focus:border-emerald-500");
    expect(markup).not.toContain("text-neutral-400");
    expect(markup).toContain("bg-surface-2");
  });
});

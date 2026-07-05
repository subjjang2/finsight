import { describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { reset: vi.fn() } }));
// signOut is a "use server" action pulling in next/headers; stub it so this
// client component can be imported in the node test environment.
vi.mock("../../app/(auth)/login/actions", () => ({ signOut: vi.fn() }));

import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  // The reset-on-logout side effect is covered by lib/analytics/client.test.ts
  // (resetUser). Rendering the form action={signOut} under renderToStaticMarkup
  // exercises React 19 server-action form paths that don't apply here, so we keep
  // this to an import smoke test.
  it("is a component", () => {
    expect(typeof LogoutButton).toBe("function");
  });
});

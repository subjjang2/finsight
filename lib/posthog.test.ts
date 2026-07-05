import { describe, it, expect } from "vitest";
import { POSTHOG_INIT_OPTIONS, resolvePostHogBootstrap } from "./posthog";

describe("resolvePostHogBootstrap", () => {
  it("returns null when no key is configured (skip init instead of sending to undefined)", () => {
    expect(resolvePostHogBootstrap(undefined)).toBeNull();
    expect(resolvePostHogBootstrap("")).toBeNull();
  });

  it("returns key + init options when a key is configured", () => {
    const bootstrap = resolvePostHogBootstrap("phc_test_key");
    expect(bootstrap).not.toBeNull();
    expect(bootstrap?.key).toBe("phc_test_key");
    expect(bootstrap?.options).toBe(POSTHOG_INIT_OPTIONS);
  });
});

describe("POSTHOG_INIT_OPTIONS", () => {
  it("enables exception autocapture so real browser errors reach Error Tracking", () => {
    expect(POSTHOG_INIT_OPTIONS.capture_exceptions).toBe(true);
  });

  it("keeps the same-origin reverse-proxy host so the strict CSP stays intact", () => {
    expect(POSTHOG_INIT_OPTIONS.api_host).toBe("/ingest");
    expect(POSTHOG_INIT_OPTIONS.ui_host).toBe("https://us.posthog.com");
  });

  it("only creates person profiles for identified users", () => {
    expect(POSTHOG_INIT_OPTIONS.person_profiles).toBe("identified_only");
  });
});

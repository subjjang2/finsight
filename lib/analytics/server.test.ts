import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Shared spies across the mocked PostHog client instances. vi.hoisted so they exist
// before the vi.mock factory runs.
const { capture, captureException, flush } = vi.hoisted(() => ({
  capture: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("posthog-node", () => ({
  PostHog: vi.fn(() => ({ capture, captureException, flush })),
}));

describe("analytics server", () => {
  beforeEach(() => {
    // The module caches a singleton client; reset so each test re-reads the env.
    vi.resetModules();
    capture.mockClear();
    captureException.mockClear();
    flush.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("no-ops when no key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { captureServerEvent, captureServerException } = await import("./server");
    await captureServerEvent("subscription_upgraded", "user-1", { tier: "pro" });
    await captureServerException(new Error("x"), { source: "analyses" });
    expect(capture).not.toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });

  it("captures a server event and flushes when a key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { captureServerEvent } = await import("./server");
    await captureServerEvent("subscription_upgraded", "user-1", { tier: "pro" });
    expect(capture).toHaveBeenCalledWith({
      distinctId: "user-1",
      event: "subscription_upgraded",
      properties: { tier: "pro" },
    });
    expect(flush).toHaveBeenCalled();
  });

  it("captures a server exception with a source tag and flushes", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { captureServerException } = await import("./server");
    const err = new Error("boom");
    await captureServerException(err, { distinctId: "user-2", source: "analyses" });
    expect(captureException).toHaveBeenCalledWith(
      err,
      "user-2",
      expect.objectContaining({ source: "analyses" }),
    );
    expect(flush).toHaveBeenCalled();
  });

  it("wraps a non-Error value into an Error before capturing", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    const { captureServerException } = await import("./server");
    await captureServerException("string failure", { source: "uploads" });
    const [errorArg] = captureException.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toContain("string failure");
  });
});

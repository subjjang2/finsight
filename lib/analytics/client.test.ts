import { afterEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { captureClientException, identifyUser, resetUser, track } from "./client";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    captureException: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

describe("analytics client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("with a configured key", () => {
    it("captures a funnel event with properties", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
      track("upload_started", { rowCount: 3 });
      expect(posthog.capture).toHaveBeenCalledWith("upload_started", { rowCount: 3 });
    });

    it("identifies a user with only user_id and tier (no PII)", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
      identifyUser("user-1", "pro");
      expect(posthog.identify).toHaveBeenCalledWith("user-1", { tier: "pro" });
    });

    it("resets on logout", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
      resetUser();
      expect(posthog.reset).toHaveBeenCalled();
    });

    it("captures a client exception", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
      const err = new Error("boom");
      captureClientException(err, { source: "test" });
      expect(posthog.captureException).toHaveBeenCalledWith(err, { source: "test" });
    });
  });

  describe("without a key (no-op)", () => {
    it("never touches posthog", () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
      track("upload_started");
      identifyUser("user-1", "free");
      resetUser();
      captureClientException(new Error("x"));
      expect(posthog.capture).not.toHaveBeenCalled();
      expect(posthog.identify).not.toHaveBeenCalled();
      expect(posthog.reset).not.toHaveBeenCalled();
      expect(posthog.captureException).not.toHaveBeenCalled();
    });
  });
});

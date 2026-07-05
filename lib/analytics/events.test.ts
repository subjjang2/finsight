import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS } from "./events";

describe("ANALYTICS_EVENTS", () => {
  it("maps keys to snake_case event names", () => {
    expect(ANALYTICS_EVENTS.uploadStarted).toBe("upload_started");
    expect(ANALYTICS_EVENTS.analysisFailed).toBe("analysis_failed");
    expect(ANALYTICS_EVENTS.subscriptionUpgraded).toBe("subscription_upgraded");
  });

  it("has unique event name values (no accidental duplicates)", () => {
    const values = Object.values(ANALYTICS_EVENTS);
    expect(new Set(values).size).toBe(values.length);
  });
});

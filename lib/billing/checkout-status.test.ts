import { describe, expect, it } from "vitest";
import {
  CHECKOUT_POLL_MAX_ATTEMPTS,
  resolveCheckoutStatus,
} from "./checkout-status";

describe("resolveCheckoutStatus", () => {
  it("is idle when the checkout=success flag is absent", () => {
    expect(resolveCheckoutStatus({ active: false, tier: "free", attempts: 0 })).toBe("idle");
    // tier is irrelevant when not returning from checkout
    expect(resolveCheckoutStatus({ active: false, tier: "pro", attempts: 99 })).toBe("idle");
  });

  it("confirms while the tier has not flipped yet and attempts remain", () => {
    expect(resolveCheckoutStatus({ active: true, tier: "free", attempts: 0 })).toBe("confirming");
    expect(
      resolveCheckoutStatus({ active: true, tier: "free", attempts: CHECKOUT_POLL_MAX_ATTEMPTS - 1 }),
    ).toBe("confirming");
  });

  it("reports success as soon as the webhook has upgraded the tier", () => {
    expect(resolveCheckoutStatus({ active: true, tier: "pro", attempts: 0 })).toBe("success");
    // success wins even if attempts are exhausted
    expect(
      resolveCheckoutStatus({ active: true, tier: "pro", attempts: CHECKOUT_POLL_MAX_ATTEMPTS }),
    ).toBe("success");
  });

  it("times out once the poll budget is spent and the tier is still free", () => {
    expect(
      resolveCheckoutStatus({ active: true, tier: "free", attempts: CHECKOUT_POLL_MAX_ATTEMPTS }),
    ).toBe("timeout");
    expect(
      resolveCheckoutStatus({ active: true, tier: "free", attempts: CHECKOUT_POLL_MAX_ATTEMPTS + 5 }),
    ).toBe("timeout");
  });
});

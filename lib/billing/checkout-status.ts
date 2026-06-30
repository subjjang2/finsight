import type { Tier } from "../../types/tier";

// State of the "returned from Polar checkout" banner. The tier upgrade is driven by an
// async webhook, so on return the profile may still be `free` for a short window; we poll
// (by refreshing the server component) until the webhook lands or the budget is spent.
export type CheckoutStatus = "idle" | "confirming" | "success" | "timeout";

// ~15s total: long enough for a healthy webhook round-trip, short enough that a stuck
// delivery falls back to an explicit retry instead of spinning forever.
export const CHECKOUT_POLL_INTERVAL_MS = 1500;
export const CHECKOUT_POLL_MAX_ATTEMPTS = 10;

export function resolveCheckoutStatus({
  active,
  tier,
  attempts,
  maxAttempts = CHECKOUT_POLL_MAX_ATTEMPTS,
}: {
  active: boolean;
  tier: Tier;
  attempts: number;
  maxAttempts?: number;
}): CheckoutStatus {
  if (!active) {
    return "idle";
  }

  if (tier === "pro") {
    return "success";
  }

  if (attempts >= maxAttempts) {
    return "timeout";
  }

  return "confirming";
}

"use client";

import { track } from "../../lib/analytics/client";
import { ANALYTICS_EVENTS } from "../../lib/analytics/events";

// Extracted from the pricing page so the upgrade form can fire a `checkout_started`
// event on click. The form still posts to /api/polar/checkout (server 303 redirect
// to Polar's hosted checkout); the onClick only adds instrumentation.
export function CheckoutButton({ disabled }: { disabled: boolean }) {
  return (
    <form action="/api/polar/checkout" method="post">
      <button
        className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => track(ANALYTICS_EVENTS.checkoutStarted, { plan: "pro", source: "pricing" })}
        type="submit"
      >
        {disabled ? "사용 중" : "업그레이드"}
      </button>
    </form>
  );
}

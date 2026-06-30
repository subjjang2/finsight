"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Tier } from "../../types/tier";
import {
  CHECKOUT_POLL_INTERVAL_MS,
  resolveCheckoutStatus,
} from "../../lib/billing/checkout-status";
import { CheckoutStatusBanner } from "./CheckoutStatusBanner";

// Drives the post-checkout banner. The tier upgrade is applied asynchronously by the Polar
// webhook, so when the user returns with ?checkout=success the profile may still be `free`.
// We poll by refreshing this (force-dynamic) page's server render, which re-reads the tier,
// until it flips to `pro` or the attempt budget is spent. Decision logic is the pure,
// tested resolveCheckoutStatus; this component only owns the timer + refresh side effects.
export function CheckoutSuccessWatcher({ active, tier }: { active: boolean; tier: Tier }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  const status = resolveCheckoutStatus({ active, tier, attempts });

  useEffect(() => {
    if (status !== "confirming") {
      return;
    }

    const timer = setTimeout(() => {
      setAttempts((current) => current + 1);
      router.refresh();
    }, CHECKOUT_POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [status, attempts, router]);

  if (status === "idle") {
    return null;
  }

  return (
    <CheckoutStatusBanner
      status={status}
      onRetry={() => {
        setAttempts(0);
        router.refresh();
      }}
    />
  );
}

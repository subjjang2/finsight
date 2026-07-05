"use client";

import posthog from "posthog-js";
import type { Tier } from "../../types/tier";
import type { AnalyticsEvent } from "./events";

// Every helper is guarded by NEXT_PUBLIC_POSTHOG_KEY. With no key the provider never
// init()s PostHog (see components/PostHogProvider.tsx), so each call must be a silent
// no-op — local dev, CI, or a self-hosted deploy without analytics. Tracking must
// never throw into the render path.
function enabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!enabled()) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, tier: Tier): void {
  if (!enabled()) return;
  // Only user_id + tier — never email/PII (financial-PII policy, CLAUDE.md).
  posthog.identify(userId, { tier });
}

export function resetUser(): void {
  if (!enabled()) return;
  posthog.reset();
}

export function captureClientException(error: unknown, properties?: Record<string, unknown>): void {
  if (!enabled()) return;
  posthog.captureException(error, properties);
}

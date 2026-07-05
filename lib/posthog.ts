import type { PostHogConfig } from "posthog-js";

// PostHog client init options. Kept here (not inline in the provider) so the config
// is unit-testable in Node without a DOM/effect harness.
export const POSTHOG_INIT_OPTIONS: Partial<PostHogConfig> = {
  // Same-origin reverse proxy (see next.config.ts rewrites). Keeps the strict CSP
  // intact and dodges ad blockers. ui_host lets in-app links reach the PostHog UI.
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2025-05-24", // modern defaults: SPA-aware pageviews, autocapture
  person_profiles: "identified_only",
  // Auto-capture uncaught errors + unhandled rejections as `$exception` events so
  // real browser errors reach Error Tracking without manual captureException calls.
  capture_exceptions: true,
};

/**
 * Resolve PostHog bootstrap config from the public key. Returns null when no key
 * is set so the caller skips init instead of sending analytics to `undefined`.
 */
export function resolvePostHogBootstrap(
  key: string | undefined,
): { key: string; options: Partial<PostHogConfig> } | null {
  if (!key) return null;
  return { key, options: POSTHOG_INIT_OPTIONS };
}

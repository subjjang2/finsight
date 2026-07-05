// Central registry of custom analytics event names, shared by the browser
// (posthog-js, lib/analytics/client) and server (posthog-node, lib/analytics/server)
// wrappers. One source of truth prevents typos and keeps the funnel vocabulary aligned
// across client and server. Values are snake_case per PostHog convention.
export const ANALYTICS_EVENTS = {
  uploadStarted: "upload_started",
  uploadCompleted: "upload_completed",
  uploadFailed: "upload_failed",
  analysisStarted: "analysis_started",
  analysisCompleted: "analysis_completed",
  analysisFailed: "analysis_failed",
  adviceRequested: "advice_requested",
  adviceGenerated: "advice_generated",
  adviceFailed: "advice_failed",
  checkoutStarted: "checkout_started",
  subscriptionUpgraded: "subscription_upgraded",
  serverError: "server_error",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

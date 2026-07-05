import { PostHog } from "posthog-node";
import type { AnalyticsEvent } from "./events";

// Server-side analytics via posthog-node. Imported ONLY from route handlers / server
// modules, so it never reaches the client bundle. Reuses the same public key as the
// browser SDK; the server posts to PostHog directly (the CSP applies to browsers only,
// so the /ingest reverse proxy is not involved here).
let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Request-scoped usage: capture then flush() immediately so events are not
      // stranded in the buffer between requests.
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return client;
}

export async function captureServerEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  try {
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch {
    // Analytics must never break the request path.
  }
}

export async function captureServerException(
  error: unknown,
  context: { source: string; distinctId?: string; properties?: Record<string, unknown> },
): Promise<void> {
  const ph = getClient();
  if (!ph) return;

  const err = error instanceof Error ? error : new Error(String(error));

  try {
    ph.captureException(err, context.distinctId, {
      source: context.source,
      ...context.properties,
    });
    await ph.flush();
  } catch {
    // Analytics must never break the request path.
  }
}

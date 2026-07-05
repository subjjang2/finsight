"use client";

import { useEffect } from "react";
import type { Tier } from "../../types/tier";
import { identifyUser } from "../../lib/analytics/client";

// Renders nothing; its only job is to run posthog.identify once the authenticated
// user + tier are known. Mounted from the dashboard layout so every signed-in view
// associates events with a stable distinct_id (user.id). Without this, PostHog's
// `person_profiles: "identified_only"` mode never creates a profile.
export function PostHogIdentify({ userId, tier }: { userId: string; tier: Tier }) {
  useEffect(() => {
    identifyUser(userId, tier);
  }, [userId, tier]);

  return null;
}

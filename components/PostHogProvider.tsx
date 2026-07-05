"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { resolvePostHogBootstrap } from "../lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const bootstrap = resolvePostHogBootstrap(process.env.NEXT_PUBLIC_POSTHOG_KEY);
    if (!bootstrap) return; // no key configured → skip init instead of sending to `undefined`

    posthog.init(bootstrap.key, bootstrap.options);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

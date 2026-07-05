---
track: review
id: review-05-admin-server-only
expect: pass
rule: A2
title: server-only module legitimately uses the service-role key (false-positive guard)
---
import "server-only";
import { createClient } from "@supabase/supabase-js";

// Used only by the Polar webhook route handler (app/api/polar/webhook).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

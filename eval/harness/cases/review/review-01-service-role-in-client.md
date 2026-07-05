---
track: review
id: review-01-service-role-in-client
expect: violation
rule: A2
title: client component instantiates Supabase with the service-role key
---
"use client";
import { createClient } from "@supabase/supabase-js";

export function AdminPanel() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return <div>admin</div>;
}

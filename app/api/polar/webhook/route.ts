import { NextResponse } from "next/server";
import { getPolarTierUpdate, verifyPolarSignature } from "../../../../lib/billing/polar";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Polar webhook secret is not configured." }, { status: 500 });
  }

  const payload = await request.text();
  const signatureHeader = request.headers.get("webhook-signature");
  const webhookId = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");

  if (!verifyPolarSignature({ payload, secret, header: signatureHeader, webhookId, timestamp })) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: unknown;

  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const update = getPolarTierUpdate(event);

  if (!update) {
    return NextResponse.json({ received: true }, { status: 202 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: update.userId, tier: update.tier }, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

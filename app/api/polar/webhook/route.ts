import { NextResponse } from "next/server";
import { getEventModifiedAt, getPolarTierUpdate, verifyPolarSignature } from "../../../../lib/billing/polar";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { captureServerEvent, captureServerException } from "../../../../lib/analytics/server";
import { ANALYTICS_EVENTS } from "../../../../lib/analytics/events";

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Polar webhook secret is not configured." }, { status: 500 });
  }

  const payload = await request.text();
  const signatureHeader = request.headers.get("webhook-signature");
  const webhookId = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");

  // Standard Webhooks: the webhook id is required (it is part of the signed content and
  // is our idempotency key). Reject deliveries that omit it.
  if (!webhookId) {
    return NextResponse.json({ error: "Missing webhook id." }, { status: 400 });
  }

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

  // Single transactional RPC: it records the webhook id (idempotency), checks ordering
  // (stale guard), and applies the tier change atomically. If anything throws, the whole
  // transaction — including the idempotency insert — rolls back, so a Polar retry is
  // reprocessed cleanly (no poison-message loss). Pre-committing the id from the route
  // (the previous multi-step flow) is what risked permanently skipping a tier change.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("apply_subscription_event", {
    p_event_id: webhookId,
    p_user_id: update?.userId ?? null,
    p_tier: update?.tier ?? null,
    p_modified_at: getEventModifiedAt(event),
  });

  if (error) {
    await captureServerException(error, {
      source: "polar.webhook.applySubscriptionEvent",
      distinctId: update?.userId,
      properties: { eventId: webhookId },
    });
    // Surface a 5xx so Polar retries and the transactional RPC can run again.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Server-side source of truth for the tier change. Fire only on first processing
  // (data !== false, i.e. not a duplicate) with a resolved user + tier.
  if (data !== false && update?.userId && update.tier) {
    await captureServerEvent(ANALYTICS_EVENTS.subscriptionUpgraded, update.userId, {
      tier: update.tier,
    });
  }

  // data === false -> the id was already processed (duplicate). Acknowledge with 200.
  return NextResponse.json({ received: true, duplicate: data === false });
}

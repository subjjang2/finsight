import { NextResponse } from "next/server";
import { createPolarCheckoutUrl } from "../../../../lib/billing/checkout";
import { getPublicSiteUrl } from "../../../../lib/auth/validation";
import { createServerClient } from "../../../../lib/supabase/server";
import { captureServerException } from "../../../../lib/analytics/server";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile not found." }, { status: 500 });
  }

  if (profile.tier === "pro") {
    return NextResponse.json({ error: "Already on Pro." }, { status: 409 });
  }

  try {
    // request.url's host behind Railway's proxy is the internal container
    // address (localhost:8080); success/return URLs must use the public site URL.
    const origin = getPublicSiteUrl();
    const url = await createPolarCheckoutUrl({
      userId: user.id,
      email: user.email ?? null,
      origin,
    });

    const wantsJson = request.headers.get("accept")?.includes("application/json") ?? false;

    if (wantsJson) {
      return NextResponse.json({ url });
    }

    return NextResponse.redirect(url, { status: 303 });
  } catch (error) {
    await captureServerException(error, {
      source: "polar.checkout",
      distinctId: user.id,
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout unavailable." }, { status: 503 });
  }
}

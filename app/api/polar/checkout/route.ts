import { NextResponse } from "next/server";
import { createPolarCheckoutUrl } from "../../../../lib/billing/checkout";
import { createServerClient } from "../../../../lib/supabase/server";

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
    const origin = new URL(request.url).origin;
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout unavailable." }, { status: 503 });
  }
}

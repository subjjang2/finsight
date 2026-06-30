import { NextResponse, type NextRequest } from "next/server";
import { getPostAuthRedirectPath, getPublicSiteUrl } from "../../../lib/auth/validation";
import { createServerClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getPostAuthRedirectPath(requestUrl.searchParams.get("next"));
  // Behind Railway's proxy request.url's host is the internal container address
  // (localhost:8080), so redirects are built from the public site URL instead.
  const siteUrl = getPublicSiteUrl();

  if (!code) {
    return NextResponse.redirect(new URL("/login", siteUrl));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login", siteUrl));
  }

  return NextResponse.redirect(new URL(next, siteUrl));
}

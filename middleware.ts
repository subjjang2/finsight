import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { E2E_COOKIE, e2eRouteDecision, isE2E } from "./lib/e2e";

function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isE2E()) {
    const authed = request.cookies.get(E2E_COOKIE)?.value === "1";
    const decision = e2eRouteDecision(pathname, authed);

    if (decision === "login") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(redirectUrl);
    }

    if (decision === "dashboard") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next({ request });
  }

  const response = NextResponse.next({
    request,
  });
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/dashboard") && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/login" && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

// [oncall E2E] 의도적 타입 에러 — build(tsc)를 실패시켜 oncall-ci-fix 파이프라인 검증. 검증 후 삭제.
const oncallE2EFault: number = "trigger-oncall";
void oncallE2EFault;

export const config = {
  matcher: ["/login", "/dashboard/:path*"],
};

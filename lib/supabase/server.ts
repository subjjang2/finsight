import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { E2E_COOKIE, createFakeSupabaseClient, isE2E } from "../e2e";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function createRealServerClient(cookieStore: CookieStore) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Route handlers and server actions can.
        }
      },
    },
  });
}

export async function createServerClient() {
  const cookieStore = await cookies();

  if (isE2E()) {
    const authed = cookieStore.get(E2E_COOKIE)?.value === "1";
    return createFakeSupabaseClient({ authed }) as unknown as ReturnType<
      typeof createRealServerClient
    >;
  }

  return createRealServerClient(cookieStore);
}

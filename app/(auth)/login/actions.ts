"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "../../../lib/supabase/server";
import { E2E_COOKIE, isE2E } from "../../../lib/e2e";
import {
  getPostAuthRedirectPath,
  validateAuthCredentials,
} from "../../../lib/auth/validation";

export type AuthMode = "login" | "signup";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  mode: AuthMode;
};

function getAuthMode(value: FormDataEntryValue | null): AuthMode {
  return value === "signup" ? "signup" : "login";
}

function getPublicSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "http://localhost:3000"
  );
}

export async function authenticate(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const mode = getAuthMode(formData.get("mode"));
  const next = getPostAuthRedirectPath(String(formData.get("next") ?? "") || null);

  if (isE2E()) {
    const cookieStore = await cookies();
    cookieStore.set(E2E_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(next);
  }

  const credentials = validateAuthCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials.ok) {
    return { status: "error", message: credentials.message, mode };
  }

  const supabase = await createServerClient();

  if (mode === "login") {
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        status: "error",
        message: "이메일 또는 비밀번호를 확인해 주세요.",
        mode,
      };
    }

    // Profile rows are created by the `handle_new_user` Postgres trigger
    // (supabase/migrations/0001_init.sql); profiles has no insert RLS policy,
    // so a client-side insert here would be silently rejected anyway.
    redirect(next);
  }

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      emailRedirectTo: `${getPublicSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "회원가입을 완료하지 못했습니다. 입력값을 확인해 주세요.",
      mode,
    };
  }

  if (data.session) {
    // Profile creation is handled by the `handle_new_user` trigger on signup.
    redirect(next);
  }

  return {
    status: "success",
    message: "확인 메일을 보냈습니다. 메일의 링크로 가입을 완료해 주세요.",
    mode,
  };
}

export async function signOut() {
  if (isE2E()) {
    const cookieStore = await cookies();
    cookieStore.delete(E2E_COOKIE);
    redirect("/login");
  }

  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "../../../lib/supabase/server";
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

async function ensureProfileRow(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.from("profiles").insert(
    {
      id: user.id,
      email: user.email,
      tier: "free",
      monthly_analysis_count: 0,
      count_period: new Date().toISOString().slice(0, 7),
    },
  );
}

export async function authenticate(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const mode = getAuthMode(formData.get("mode"));
  const next = getPostAuthRedirectPath(String(formData.get("next") ?? "") || null);
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

    await ensureProfileRow(supabase);
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
    await ensureProfileRow(supabase);
    redirect(next);
  }

  return {
    status: "success",
    message: "확인 메일을 보냈습니다. 메일의 링크로 가입을 완료해 주세요.",
    mode,
  };
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

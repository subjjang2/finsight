export type AuthCredentials =
  | {
      ok: true;
      email: string;
      password: string;
    }
  | {
      ok: false;
      message: string;
    };

export function validateAuthCredentials(input: {
  email: FormDataEntryValue | string | null;
  password: FormDataEntryValue | string | null;
}): AuthCredentials {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");

  if (!email) {
    return { ok: false, message: "이메일을 입력해 주세요." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "이메일 형식을 확인해 주세요." };
  }

  if (!password) {
    return { ok: false, message: "비밀번호를 입력해 주세요." };
  }

  if (password.length < 8) {
    return { ok: false, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  return { ok: true, email, password };
}

export function getPostAuthRedirectPath(next: string | null): string {
  if (!next) {
    return "/dashboard";
  }

  if (!next.startsWith("/dashboard")) {
    return "/dashboard";
  }

  return next;
}

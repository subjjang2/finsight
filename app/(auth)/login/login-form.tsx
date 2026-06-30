"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input } from "../../../components/ui";
import type { AuthActionState, AuthMode } from "./actions";
import { authenticate, signInWithGoogle } from "./actions";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
  mode: "login",
};

type LoginFormProps = {
  next: string;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.41 5.41 0 0 1 3.97 7.3V4.96H.96a9 9 0 0 0 0 8.09l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

function GoogleSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleMark />
      {pending ? "이동 중" : "Google로 계속하기"}
    </button>
  );
}

export function LoginForm({ next }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [state, formAction, isPending] = useActionState(
    authenticate,
    initialState,
  );
  const activeMode = isPending ? mode : state.mode;
  const statusText = useMemo(() => {
    if (isPending) {
      return mode === "signup" ? "계정을 만드는 중입니다." : "로그인 중입니다.";
    }

    if (state.status === "error" || state.status === "success") {
      return state.message;
    }

    return "이메일과 비밀번호로 계속하세요.";
  }, [isPending, mode, state.message, state.status]);

  return (
    <div className="space-y-5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleSubmitButton />
      </form>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-muted-soft">또는</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />

      <div
        aria-label="로그인 또는 회원가입 선택"
        className="grid grid-cols-2 rounded-lg border border-line bg-surface-2 p-1"
        role="tablist"
      >
        <button
          aria-selected={mode === "login"}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-white text-black"
              : "text-muted hover:text-ink"
          }`}
          onClick={() => setMode("login")}
          role="tab"
          type="button"
        >
          로그인
        </button>
        <button
          aria-selected={mode === "signup"}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "signup"
              ? "bg-white text-black"
              : "text-muted hover:text-ink"
          }`}
          onClick={() => setMode("signup")}
          role="tab"
          type="button"
        >
          회원가입
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-muted">
          이메일
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-muted">
          비밀번호
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          placeholder="비밀번호"
        />
      </div>

      <p
        aria-live="polite"
        className={`min-h-5 text-sm ${
          state.status === "error"
            ? "text-error"
            : state.status === "success"
              ? "text-accent"
              : "text-muted"
        }`}
      >
        {statusText}
      </p>

      <Button className="w-full" disabled={isPending} type="submit">
        {isPending
          ? "처리 중"
          : mode === "signup"
            ? "계정 만들기"
            : "로그인"}
      </Button>

      <p className="text-sm leading-relaxed text-muted">
        {activeMode === "signup"
          ? "가입 후 프로필은 Supabase 트리거가 자동으로 준비합니다."
          : "아직 계정이 없다면 위에서 회원가입으로 전환하세요."}
      </p>
      </form>
    </div>
  );
}

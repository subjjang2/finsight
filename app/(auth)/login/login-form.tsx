"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Input } from "../../../components/ui";
import type { AuthActionState, AuthMode } from "./actions";
import { authenticate } from "./actions";

const initialState: AuthActionState = {
  status: "idle",
  message: "",
  mode: "login",
};

type LoginFormProps = {
  next: string;
};

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
  );
}

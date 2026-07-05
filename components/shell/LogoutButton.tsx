"use client";

import { signOut } from "../../app/(auth)/login/actions";
import { resetUser } from "../../lib/analytics/client";

// Extracted from the sidebar so logout can reset the PostHog identity before the
// server action redirects. reset() runs synchronously on click, before the form
// submits, so subsequent (logged-out) events are anonymous again.
export function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        onClick={() => resetUser()}
        type="submit"
      >
        <svg
          aria-hidden="true"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path d="M10 17 5 12l5-5" />
          <path d="M5 12h12" />
          <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
        </svg>
        로그아웃
      </button>
    </form>
  );
}

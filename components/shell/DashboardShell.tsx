"use client";

import { type ReactNode, useState } from "react";
import { FREE_MONTHLY_LIMIT } from "../../types/tier";
import { Sidebar, type SidebarPlan } from "./Sidebar";

export function DashboardShell({
  children,
  plan = "free",
  used = 0,
  limit = FREE_MONTHLY_LIMIT,
}: {
  children: ReactNode;
  plan?: SidebarPlan;
  used?: number;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Mobile top bar — visible below the lg breakpoint only. */}
      <header className="flex items-center justify-between border-b border-line px-4 py-3 lg:hidden">
        <span className="text-base font-semibold text-ink">finsight</span>
        <button
          aria-expanded={open}
          aria-label="메뉴 열기"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          onClick={() => setOpen(true)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop static sidebar. */}
        <div className="hidden lg:flex">
          <Sidebar limit={limit} plan={plan} used={used} />
        </div>

        {/* Mobile off-canvas drawer. */}
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="메뉴 닫기"
              className="absolute inset-0 bg-black/60"
              onClick={() => setOpen(false)}
              type="button"
            />
            <div className="absolute inset-y-0 left-0">
              <Sidebar
                limit={limit}
                onNavigate={() => setOpen(false)}
                plan={plan}
                used={used}
              />
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

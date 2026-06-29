import Link from "next/link";
import { signOut } from "../../app/(auth)/login/actions";
import { FREE_MONTHLY_LIMIT, PRO_FAIR_USE_LIMIT } from "../../types/tier";
import { Badge } from "../ui";
import { SidebarNav } from "./SidebarNav";

export type SidebarPlan = "free" | "pro";

function planMonthlyLimit(plan: SidebarPlan): number {
  return plan === "pro" ? PRO_FAIR_USE_LIMIT : FREE_MONTHLY_LIMIT;
}

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      className="flex items-center gap-2.5 px-2 pb-5"
      href="/dashboard"
      onClick={onNavigate}
    >
      <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 32 32">
        <rect fill="var(--accent)" height="32" rx="9" width="32" />
        <path
          d="M9 20.5 14 13l4.5 4.5L23 10.5"
          fill="none"
          stroke="#04140d"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.6}
        />
        <circle cx="23" cy="10.5" fill="#04140d" r="2.4" />
      </svg>
      <span className="text-lg font-semibold text-ink">finsight</span>
    </Link>
  );
}

function UsageMeter({
  plan,
  used,
  limit,
}: {
  plan: SidebarPlan;
  used: number;
  limit: number;
}) {
  const cappedRatio = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-sm font-semibold text-ink">
            {plan === "pro" ? "Pro" : "Free"}
          </span>
        </div>
        <Badge>{`월 ${planMonthlyLimit(plan)}건`}</Badge>
      </div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>이번 달 분석</span>
        <span className="tabular-nums">
          {used}/{limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-lg bg-surface-3">
        <div
          className="h-full rounded-lg bg-accent"
          style={{ width: `${cappedRatio}%` }}
        />
      </div>
    </div>
  );
}

export function Sidebar({
  plan = "free",
  used = 0,
  limit = FREE_MONTHLY_LIMIT,
  onNavigate,
}: {
  plan?: SidebarPlan;
  used?: number;
  limit?: number;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex min-h-screen w-[232px] shrink-0 flex-col border-r border-line bg-canvas px-4 py-5">
      <Logo onNavigate={onNavigate} />
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto space-y-3">
        <UsageMeter limit={limit} plan={plan} used={used} />
        <form action={signOut}>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
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
      </div>
    </aside>
  );
}

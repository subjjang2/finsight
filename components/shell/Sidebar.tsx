import Link from "next/link";
import { signOut } from "../../app/(auth)/login/actions";
import { Badge } from "../ui";

export type SidebarPlan = "free" | "pro";

type NavItem = {
  href: string;
  label: string;
  icon: "insights" | "upload" | "trend" | "pricing";
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "인사이트", icon: "insights" },
  { href: "/dashboard/upload", label: "업로드", icon: "upload" },
  { href: "/dashboard/trend", label: "월별 추이", icon: "trend" },
  { href: "/dashboard/pricing", label: "요금제", icon: "pricing" },
];

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2 pb-5">
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

function NavIcon({
  icon,
  active,
}: {
  icon: NavItem["icon"];
  active: boolean;
}) {
  const className = active ? "text-ink" : "text-muted";
  const common = {
    "aria-hidden": true,
    className: `h-[18px] w-[18px] ${className}`,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
    viewBox: "0 0 24 24",
  };

  if (icon === "insights") {
    return (
      <svg {...common}>
        <rect height="7" rx="1.5" width="7" x="3" y="3" />
        <rect height="7" rx="1.5" width="7" x="14" y="3" />
        <rect height="7" rx="1.5" width="7" x="3" y="14" />
        <rect height="7" rx="1.5" width="7" x="14" y="14" />
      </svg>
    );
  }

  if (icon === "upload") {
    return (
      <svg {...common}>
        <path d="M12 16V4m-5 5 5-5 5 5" />
        <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
      </svg>
    );
  }

  if (icon === "trend") {
    return (
      <svg {...common}>
        <path d="m3 17 5-5 4 4 8-9" />
        <path d="M21 7v5M16 7h5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18m0-12-2.5 2.5m-7 7L6 18" />
    </svg>
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
        <Badge>{plan === "pro" ? "월 200건" : "월 5건"}</Badge>
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
  currentPath = "/dashboard",
  plan = "free",
  used = 0,
  limit = 5,
}: {
  currentPath?: string;
  plan?: SidebarPlan;
  used?: number;
  limit?: number;
}) {
  return (
    <aside className="flex min-h-screen w-[232px] shrink-0 flex-col border-r border-line bg-canvas px-4 py-5">
      <Logo />
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? currentPath === item.href
              : currentPath.startsWith(item.href);

          return (
            <Link
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-surface-2 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
              href={item.href}
              key={item.href}
            >
              <NavIcon active={active} icon={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
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

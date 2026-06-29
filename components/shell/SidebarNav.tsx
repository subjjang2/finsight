"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavIconName = "insights" | "upload" | "trend" | "pricing";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "인사이트", icon: "insights" },
  { href: "/dashboard/upload", label: "업로드", icon: "upload" },
  { href: "/dashboard/trend", label: "월별 추이", icon: "trend" },
  { href: "/dashboard/pricing", label: "요금제", icon: "pricing" },
];

function NavIcon({ icon, active }: { icon: NavIconName; active: boolean }) {
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

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/dashboard";

  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-surface-2 text-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <NavIcon active={active} icon={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

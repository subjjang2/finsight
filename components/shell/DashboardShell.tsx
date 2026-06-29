import type { ReactNode } from "react";
import { Sidebar, type SidebarPlan } from "./Sidebar";

export function DashboardShell({
  children,
  currentPath,
  plan = "free",
  used = 0,
  limit = 5,
}: {
  children: ReactNode;
  currentPath?: string;
  plan?: SidebarPlan;
  used?: number;
  limit?: number;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <Sidebar currentPath={currentPath} limit={limit} plan={plan} used={used} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-6xl px-8 py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}

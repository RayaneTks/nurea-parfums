"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminTabBar } from "./AdminTabBar";
import { AdminTopBar } from "./AdminTopBar";

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return (
      <div className="admin-shell flex min-h-dvh flex-col bg-[var(--admin-bg)] text-[var(--admin-text)] antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-dvh flex-col bg-[var(--admin-bg)] text-[var(--admin-text)] antialiased">
      <AdminTopBar />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <AdminTabBar />
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { BottomNav } from "./BottomNav";

interface AdminShellClientProps {
  children: ReactNode;
}

export function AdminShellClient({ children }: AdminShellClientProps) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  useEffect(() => {
    document.body.classList.add("admin-route");
    document.documentElement.classList.add("admin-route-root");
    return () => {
      document.body.classList.remove("admin-route");
      document.documentElement.classList.remove("admin-route-root");
    };
  }, []);

  if (isLogin) {
    return (
      <div className="admin-theme min-h-[100dvh] bg-admin-bg text-admin-text">
        <div className="admin-mobile-shell !pb-0 pt-[env(safe-area-inset-top,0px)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-theme min-h-[100dvh] bg-admin-bg text-admin-text">
      <AdminShell>{children}</AdminShell>
      <BottomNav />
    </div>
  );
}

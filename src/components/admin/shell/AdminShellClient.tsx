"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { AdminShell } from "./AdminShell";
import { BottomNav } from "./BottomNav";

const ADMIN_TAB_ROUTES = [
  "/admin/compta",
  "/admin/ordres",
  "/admin/vendre",
  "/admin/catalogue",
] as const;

function runWhenIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(() => fn(), { timeout: 2800 });
    return () => cancelIdleCallback(id);
  }
  const t = window.setTimeout(fn, 0);
  return () => window.clearTimeout(t);
}

interface AdminShellClientProps {
  children: ReactNode;
}

export function AdminShellClient({ children }: AdminShellClientProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  useEffect(() => {
    document.body.classList.add("admin-route");
    document.documentElement.classList.add("admin-route-root");
    return () => {
      document.body.classList.remove("admin-route");
      document.documentElement.classList.remove("admin-route-root");
    };
  }, []);

  /** Précharge les autres onglets admin en idle (complète le prefetch `Link` de la barre). */
  useEffect(() => {
    if (isLogin) return;
    return runWhenIdle(() => {
      for (const href of ADMIN_TAB_ROUTES) {
        if (href === "/admin/compta" && (pathname === "/admin" || pathname.startsWith("/admin/compta")))
          continue;
        if (href === "/admin/ordres" && pathname.startsWith("/admin/ordres")) continue;
        if (href === "/admin/vendre" && pathname.startsWith("/admin/vendre")) continue;
        if (
          href === "/admin/catalogue" &&
          (pathname.startsWith("/admin/catalogue") ||
            pathname.startsWith("/admin/perfumes") ||
            pathname.startsWith("/admin/brands"))
        )
          continue;
        router.prefetch(href);
      }
    });
  }, [isLogin, pathname, router]);

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
    <div className="admin-theme flex min-h-[100dvh] flex-col bg-admin-bg text-admin-text">
      <AdminShell>{children}</AdminShell>
      <BottomNav />
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { TabBar } from "./TabBar";
import { CommandPalette } from "./CommandPalette";
import { AdminLoadingProgress } from "./AdminLoadingProgress";
import { PwaInstallHint } from "./PwaInstallHint";

type AdminShellProps = {
  children: ReactNode;
};

/**
 * Layout shell admin — utilisé par app/admin/layout.tsx.
 *
 * - Frame mobile 430px max sur desktop (PWA iOS).
 * - Header sticky + TabBar bottom + Command palette + Loading progress + PWA hint.
 * - Login page : bypass shell complet.
 */
export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const [paletteOpen, setPaletteOpen] = useState(false);

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
      <div className="admin-theme w-full min-h-[100dvh]">
        <div className="mx-auto w-full max-w-[var(--admin-app-max-width)] min-h-[100dvh]">
          {children}
        </div>
      </div>
    );
  }

  const focusCatalogueSearch = () => {
    if (typeof document === "undefined") return;
    document.getElementById("admin-nurea-search")?.focus();
  };

  return (
    <div className="admin-theme w-full min-h-[100dvh]">
      <div
        className="mx-auto flex flex-col w-full max-w-[var(--admin-app-max-width)] min-h-[100dvh]"
        style={{ paddingBottom: "calc(var(--admin-tab-bar-height) + env(safe-area-inset-bottom, 0px))" }}
      >
        <AppHeader
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onOpenSearch={focusCatalogueSearch}
        />
        <PwaInstallHint />
        {children}
      </div>
      <AdminLoadingProgress />
      <TabBar />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

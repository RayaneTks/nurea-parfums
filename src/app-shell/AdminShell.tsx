"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { TabBar } from "./TabBar";
import { CommandPalette } from "./CommandPalette";
import { AdminLoadingProgress } from "./AdminLoadingProgress";
import { PwaInstallHint } from "./PwaInstallHint";
import { useAdminKeyboardInset } from "@/hooks/useAdminKeyboardInset";

type AdminShellProps = {
  children: ReactNode;
};

/**
 * Layout shell admin — utilisé par app/admin/layout.tsx.
 *
 * - Frame mobile 430px max sur desktop (PWA iOS).
 * - Header sticky + zone scroll dédiée + TabBar bottom.
 * - Login page : bypass shell complet.
 */
export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname() ?? "";
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const [paletteOpen, setPaletteOpen] = useState(false);
  useAdminKeyboardInset();

  if (isLogin) {
    return (
      <div className="admin-theme flex min-h-[100dvh] min-h-[100svh] w-full">
        <div className="mx-auto flex min-h-[100dvh] min-h-[100svh] w-full max-w-[var(--admin-app-max-width)]">
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
    <div className="admin-theme admin-app-container">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          onOpenCommandPalette={() => setPaletteOpen(true)}
          onOpenSearch={focusCatalogueSearch}
        />
        <PwaInstallHint />
        <div
          id="admin-scroll-root"
          className="admin-shell-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
        >
          {children}
        </div>
      </div>
      <TabBar />
      <AdminLoadingProgress />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

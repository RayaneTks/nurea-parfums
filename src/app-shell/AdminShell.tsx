"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { TabBar } from "./TabBar";
import { CommandPalette } from "./CommandPalette";
import { AdminLoadingProgress } from "./AdminLoadingProgress";
import { PwaInstallHint } from "./PwaInstallHint";
import { ViewportSync } from "./ViewportSync";

type AdminShellProps = {
  children: ReactNode;
};

/**
 * Layout shell admin — CSS-only stable, pas de listener visualViewport.
 *
 * Pattern :
 * - Outer : position:fixed inset:0 height:100dvh overflow:hidden
 *   → la page entière est pinée au viewport, body ne scrolle JAMAIS
 * - Inner column : flex flex-col h-full
 * - AppHeader : shrink-0 (top)
 * - Main content : flex-1 min-h-0 overflow-y-auto (seul cet espace scrolle)
 * - TabBar : shrink-0 (bottom, dans le flux, donc toujours visible)
 *
 * Quand le clavier iOS overlay :
 * - Le shell reste à 100dvh (CSS, ne bouge pas)
 * - Le clavier couvre le bas — c'est le comportement natif attendu
 * - Le focus handler (ViewportSync) glisse l'input dans la vue avec
 *   scrollIntoView({block:'nearest'}) après 80ms
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
      <>
        <ViewportSync />
        <div
          className="admin-theme w-full"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: "100dvh",
            maxHeight: "100dvh",
            overflow: "hidden",
          }}
        >
          <div className="mx-auto h-full w-full max-w-[var(--admin-app-max-width)] overflow-y-auto">
            {children}
          </div>
        </div>
      </>
    );
  }

  const focusCatalogueSearch = () => {
    if (typeof document === "undefined") return;
    document.getElementById("admin-nurea-search")?.focus();
  };

  return (
    <>
      <ViewportSync />
      <div
        className="admin-theme w-full"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
        }}
      >
        <div className="mx-auto flex h-full w-full max-w-[var(--admin-app-max-width)] flex-col">
          <AppHeader
            onOpenCommandPalette={() => setPaletteOpen(true)}
            onOpenSearch={focusCatalogueSearch}
          />
          <PwaInstallHint />
          <main
            className="flex-1 min-h-0 overflow-y-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </main>
          <TabBar />
        </div>
        <AdminLoadingProgress />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </>
  );
}

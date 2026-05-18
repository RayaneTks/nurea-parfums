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
      <>
        <ViewportSync />
        <div
          className="admin-theme w-full"
          style={{ height: "var(--admin-vh, 100dvh)" }}
        >
          <div
            className="mx-auto w-full max-w-[var(--admin-app-max-width)]"
            style={{ height: "var(--admin-vh, 100dvh)" }}
          >
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
        style={{ height: "var(--admin-vh, 100dvh)", overflow: "hidden" }}
      >
        <div
          className="mx-auto flex flex-col w-full max-w-[var(--admin-app-max-width)]"
          style={{ height: "100%", overflow: "hidden" }}
        >
          <AppHeader
            onOpenCommandPalette={() => setPaletteOpen(true)}
            onOpenSearch={focusCatalogueSearch}
          />
          <PwaInstallHint />
          <div
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingBottom:
                "calc(var(--admin-tab-bar-height) + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {children}
          </div>
        </div>
        <TabBar />
        <AdminLoadingProgress />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </>
  );
}

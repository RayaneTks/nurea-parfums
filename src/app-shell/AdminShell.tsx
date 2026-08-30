"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { PullToRefresh } from "./PullToRefresh";
import { TabBar } from "./TabBar";
import { CommandPalette } from "./CommandPalette";
import { AdminLoadingProgress } from "./AdminLoadingProgress";
import { PwaInstallHint } from "./PwaInstallHint";
import { UndoProvider } from "./UndoProvider";
import { ViewportSync } from "./ViewportSync";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  useAdminKeyboardInset();

  if (isLogin) {
    return (
      <div className="admin-theme flex h-full w-full">
        <ViewportSync />
        <div className="mx-auto flex h-full w-full max-w-[var(--admin-app-max-width)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <UndoProvider>
      <div className="admin-theme admin-app-container">
        {/* `--admin-vh` alimente la hauteur max des sheets : sans ce composant
            monté, elles retombent sur 100dvh, que iOS ne met pas à jour quand
            le clavier s'ouvre. */}
        <ViewportSync />
        <ServiceWorkerRegistrar />
        <PwaInstallHint />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <AppHeader onOpenCommandPalette={() => setPaletteOpen(true)} />
          <PullToRefresh scrollRef={scrollRef} />
          <div
            ref={scrollRef}
            id="admin-scroll-root"
            className="admin-shell-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
          >
            {children}
          </div>
        </div>
        <TabBar />
        <AdminLoadingProgress />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </UndoProvider>
  );
}

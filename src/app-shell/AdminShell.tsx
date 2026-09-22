"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { FeedbackProvider } from "./FeedbackProvider";
import { DRAFT_KEYS } from "./hooks/draft-store";
import { useDraftPresence } from "./hooks/useDraft";
import { useUrlState } from "./hooks/useUrlState";
import { PaletteActionsProvider } from "./PaletteActions";
import {
  allowsPullToRefresh,
  hasActiveFilters,
  hasSheetParams,
  isTabRoot,
  onTabPress,
  tabMemory,
  tabOf,
  type TabId,
} from "./navigation";
import { PreprodBanner } from "./PreprodBanner";
import { PullToRefresh } from "./PullToRefresh";
import { ServiceWorkerRegistrar } from "./pwa/ServiceWorkerRegistrar";
import { withoutSheet } from "./routes";
import { markSessionHint } from "./session-hint";
import { SheetRegistryProvider, useSheetRegistry } from "./SheetRegistry";
import { NavigationProgress, ShellNavigationProvider, scrollRootToTop, useShellNavigation } from "./ShellNavigation";
import { TabBar, type TabBadge } from "./TabBar";
import { UndoProvider } from "./UndoProvider";
import { ViewportService } from "./ViewportService";

type AdminShellProps = {
  /** `NUREA_ENV=preprod`, lu par le layout côté serveur (07 §1.3, garde-fou 6). */
  preprod?: boolean;
  /**
   * Sheets que la palette ouvre sur l'écran courant (06 §4.4, A16) : rendues À CÔTÉ de la palette, jamais
   * sous elle. Un emplacement plutôt qu'un import — le shell ne dépend d'aucun écran (04 §1.3) ; c'est le
   * layout de `(gestion)` qui y monte `PaletteCollectHost`.
   */
  paletteSheets?: ReactNode;
  children: ReactNode;
};

/**
 * La coque de la gestion (05 §3.4), montée par `app/admin/(gestion)/layout.tsx` après
 * `requireSession()` : bandeau de préproduction, header, UNE zone de défilement
 * (`#admin-scroll-root`), tab bar, palette, toasts, filet « Annuler », service viewport.
 *
 * Rail de 430 px centré, hauteurs en `100 %` (jamais `100dvh`, qui casse le `position: fixed` de la
 * tab bar en PWA iOS). Les écrans ne rendent que leur contenu, dans `PageScaffold`.
 */
export function AdminShell({ preprod = false, paletteSheets, children }: AdminShellProps) {
  return (
    <FeedbackProvider>
      <UndoProvider>
        <SheetRegistryProvider>
          <ShellNavigationProvider>
            <PaletteActionsProvider>
              <ShellFrame preprod={preprod} paletteSheets={paletteSheets}>
                {children}
              </ShellFrame>
            </PaletteActionsProvider>
          </ShellNavigationProvider>
        </SheetRegistryProvider>
      </UndoProvider>
    </FeedbackProvider>
  );
}

const DRAFT_BADGE: TabBadge = { label: "brouillon en cours" };

/**
 * La palette est montée par le shell, donc présente sur TOUS les écrans — mais elle n'est ouverte que
 * par un geste (04 §15 règle 11). Son code (dialogue Radix, briques de résultat, formats de date et de
 * montant) n'a rien à faire dans le paquet initial des écrans terrain : il arrive au premier ⌘K ou au
 * premier tap sur « Rechercher ». `ssr: false` : elle n'existe que fermée tant qu'on ne la demande pas.
 */
const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), { ssr: false });

function ShellFrame({ preprod, paletteSheets, children }: { preprod: boolean; paletteSheets?: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { navigate, scrollRoot, onLocation } = useShellNavigation();
  const sheets = useSheetRegistry();
  const [searchOpen, setSearchOpen] = useState(false);
  /*
   * La palette n'est MONTÉE qu'au premier appel : un `dynamic()` rendu en permanence irait chercher
   * son morceau dès l'arrivée sur l'écran, ce qui ne diffère rien du tout. Une fois montée, elle le
   * reste — son animation de sortie a besoin de l'être.
   */
  const [paletteMounted, setPaletteMounted] = useState(false);
  const hasDraft = useDraftPresence(DRAFT_KEYS.vendre);

  const togglePalette = useCallback((open?: boolean) => {
    setPaletteMounted(true);
    setSearchOpen((current) => open ?? !current);
  }, []);

  // Une session valide est ouverte sur cet appareil : l'écran de connexion saura parler d'expiration.
  useEffect(() => markSessionHint(), []);

  // ⌘K / Ctrl+K avec un clavier physique (06 §4.4).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  const pressTab = useCallback(
    (tab: TabId) => {
      const root = scrollRoot.current;
      const current = `${window.location.pathname}${window.location.search}`;
      const openDrawer = document.querySelector<HTMLElement>('[data-vaul-drawer][data-state="open"]');
      const sheetOpen = (sheets?.hasOpenSheet() ?? false) || hasSheetParams(window.location.search) || openDrawer !== null;
      const action = onTabPress(
        tab,
        {
          activeTab: tabOf(current),
          sheetOpen,
          isRoot: isTabRoot(current),
          scrollTop: root?.scrollTop ?? 0,
          rootHasFilters: hasActiveFilters(tab, window.location.search),
        },
        tabMemory,
      );
      switch (action.kind) {
        case "restore":
        case "goRoot":
          navigate(action.url, { scrollTop: action.scrollTop });
          break;
        case "closeSheet":
          if (sheets?.closeTopSheet()) break;
          if (hasSheetParams(window.location.search)) {
            navigate(withoutSheet(current), { replace: true, scrollTop: root?.scrollTop ?? 0 });
          } else {
            // Sheet non enregistrée : Échap, que vaul traite comme sa propre fermeture (garde de saisie comprise).
            openDrawer?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          }
          break;
        case "scrollTop":
          if (root) scrollRootToTop(root);
          break;
        case "resetFilters":
          navigate(action.url, { replace: true, scrollTop: 0 });
          break;
        case "none":
          break;
      }
    },
    [navigate, scrollRoot, sheets],
  );

  return (
    <div className="admin-theme admin-paint admin-app-container">
      <ViewportService />
      <ServiceWorkerRegistrar />
      <Suspense fallback={null}>
        <LocationTracker onLocation={onLocation} />
      </Suspense>
      {preprod ? <PreprodBanner /> : null}
      <AppHeader onOpenSearch={() => togglePalette(true)} />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <NavigationProgress />
        <PullToRefresh scrollRef={scrollRoot} enabled={allowsPullToRefresh(pathname)} />
        <div
          ref={scrollRoot}
          id="admin-scroll-root"
          className="admin-shell-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
        >
          {children}
        </div>
      </div>
      <TabBar onTabPress={pressTab} badges={hasDraft ? { vendre: DRAFT_BADGE } : undefined} />
      {paletteMounted ? <CommandPalette open={searchOpen} onOpenChange={togglePalette} /> : null}
      {paletteSheets}
    </div>
  );
}

/** Chaque changement d'URL (chemin ou query) nourrit la mémoire d'onglet ; sous `Suspense` (04 §3.7). */
function LocationTracker({ onLocation }: { onLocation: (url: string) => void }) {
  const { url } = useUrlState();
  useEffect(() => {
    onLocation(url);
  }, [url, onLocation]);
  return null;
}

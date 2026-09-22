"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
import { tabMemory, tabOf } from "./navigation";

type NavigateOptions = {
  /** `replace` pour effacer un filtre ou fermer une sheet : l'historique ne s'allonge pas. */
  replace?: boolean;
  /** Défilement à restituer une fois l'écran affiché (mémoire d'onglet) ; défaut : en haut. */
  scrollTop?: number;
};

type ShellNavigationValue = {
  navigate: (url: string, options?: NavigateOptions) => void;
  /** Une navigation lancée par le shell attend vraiment sa réponse. */
  pending: boolean;
  /** La zone de défilement unique (`#admin-scroll-root`). */
  scrollRoot: RefObject<HTMLDivElement | null>;
  /** À appeler à chaque changement d'URL (chemin ou query) : mémoire d'onglet et défilement. */
  onLocation: (url: string) => void;
};

const ShellNavigationContext = createContext<ShellNavigationValue | null>(null);

const currentUrl = () => `${window.location.pathname}${window.location.search}`;

/**
 * Pose un défilement même si l'écran n'est pas encore assez long : les blocs streamés arrivent
 * après la navigation. Jusqu'à une seconde d'essais, abandonnés dès que le doigt reprend la main.
 */
function restoreScroll(root: HTMLElement, top: number): () => void {
  let frame = 0;
  let tries = 0;
  const stop = () => {
    window.cancelAnimationFrame(frame);
    root.removeEventListener("touchstart", stop);
    root.removeEventListener("wheel", stop);
  };
  const step = () => {
    root.scrollTop = top;
    tries += 1;
    if (Math.abs(root.scrollTop - top) <= 1 || tries > 60) {
      stop();
      return;
    }
    frame = window.requestAnimationFrame(step);
  };
  root.addEventListener("touchstart", stop, { passive: true });
  root.addEventListener("wheel", stop, { passive: true });
  step();
  return stop;
}

/**
 * Navigation du shell (tab bar, retour, palette) : transition réelle de Next (`pending`), défilement
 * restitué, et mémoire d'onglet tenue à jour — URL à chaque navigation, défilement à chaque geste.
 */
export function ShellNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const scrollRoot = useRef<HTMLDivElement | null>(null);
  const pendingScroll = useRef<{ url: string; top: number } | null>(null);
  const stopRestore = useRef<(() => void) | null>(null);

  const applyScroll = useCallback((top: number) => {
    const root = scrollRoot.current;
    if (!root) return;
    stopRestore.current?.();
    stopRestore.current = restoreScroll(root, top);
  }, []);

  const navigate = useCallback(
    (url: string, options: NavigateOptions = {}) => {
      const top = options.scrollTop ?? 0;
      if (url === currentUrl()) {
        applyScroll(top);
        return;
      }
      pendingScroll.current = { url, top };
      startTransition(() => {
        if (options.replace) router.replace(url, { scroll: false });
        else router.push(url, { scroll: false });
      });
    },
    [applyScroll, router],
  );

  const onLocation = useCallback(
    (url: string) => {
      const tab = tabOf(url);
      if (tab) tabMemory.remember(tab, url);
      const target = pendingScroll.current;
      if (!target) return;
      pendingScroll.current = null;
      // Une redirection (session expirée, ancienne adresse) mène ailleurs : rien à restituer.
      if (target.url === url) applyScroll(target.top);
    },
    [applyScroll],
  );

  // Défilement mémorisé pour l'écran que montre l'adresse réelle du navigateur, à chaque image au plus.
  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;
    let frame = 0;
    const record = () => {
      frame = 0;
      const url = currentUrl();
      const tab = tabOf(url);
      if (tab) tabMemory.remember(tab, url, root.scrollTop);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(record);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      stopRestore.current?.();
    };
  }, []);

  const value = useMemo(() => ({ navigate, pending, scrollRoot, onLocation }), [navigate, pending, onLocation]);
  return <ShellNavigationContext.Provider value={value}>{children}</ShellNavigationContext.Provider>;
}

export function useShellNavigation(): ShellNavigationValue {
  const ctx = useContext(ShellNavigationContext);
  if (!ctx) throw new Error("useShellNavigation : composant hors du shell.");
  return ctx;
}

/** Barre fine sous le header, seulement pendant une attente réelle de plus de 150 ms (06 §3.8). */
export function NavigationProgress() {
  const { pending } = useShellNavigation();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, [pending]);
  return (
    <div
      aria-hidden
      data-navigation-pending={visible || undefined}
      className="admin-transition pointer-events-none absolute inset-x-0 top-0 z-[var(--admin-z-app-header)] h-0.5 bg-[var(--admin-accent)]"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}

/** Défilement animé vers le haut (260 ms, 06 §1.5) ; instantané si le mouvement est réduit. */
export function scrollRootToTop(root: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const from = root.scrollTop;
  if (reduced || from <= 0) {
    root.scrollTop = 0;
    return;
  }
  const raw = getComputedStyle(root).getPropertyValue("--admin-duration-slow").trim();
  const duration = Number.parseFloat(raw) || 0;
  const start = performance.now();
  const step = (now: number) => {
    const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
    // ease-out : l'écran répond vite et se pose doucement.
    root.scrollTop = from * (1 - (1 - (1 - t) ** 3));
    if (t < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

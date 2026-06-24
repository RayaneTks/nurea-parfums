"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Élément scrollable surveillé. */
  scrollRef: { current: HTMLElement | null };
  /** Déclenché au relâchement au-delà du seuil. Peut être async. */
  onRefresh: () => void | Promise<void>;
  /** Seuil de déclenchement en px (défaut 64). */
  threshold?: number;
  /** Désactive le geste (ex. prefers-reduced-motion ou refresh en cours). */
  disabled?: boolean;
};

const MAX_PULL = 96;
const RESISTANCE = 0.5;

/**
 * Pull-to-refresh tactile pour PWA iOS standalone (pas de refresh navigateur).
 *
 * - N'arme que si la zone est tout en haut (`scrollTop <= 0`).
 * - Résistance progressive, seuil de déclenchement, retour amorti.
 * - Listeners attachés une seule fois ; l'état courant passe par des refs
 *   pour éviter de re-souscrire à chaque frame du drag.
 */
export function usePullToRefresh({ scrollRef, onRefresh, threshold = 64, disabled }: Options) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Garde la dernière closure sans re-binder les listeners.
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const applyPull = (v: number) => {
    pullRef.current = v;
    setPull(v);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? null;
      active.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;
      if (delta <= 0 || el.scrollTop > 0) {
        if (active.current) applyPull(0);
        active.current = false;
        return;
      }
      active.current = true;
      if (e.cancelable) e.preventDefault();
      applyPull(Math.min(MAX_PULL, delta * RESISTANCE));
    };

    const onTouchEnd = () => {
      if (!active.current) {
        startY.current = null;
        return;
      }
      active.current = false;
      startY.current = null;
      if (pullRef.current >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        applyPull(threshold);
        Promise.resolve(onRefreshRef.current()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          applyPull(0);
        });
      } else {
        applyPull(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scrollRef, threshold, disabled]);

  return { pull, refreshing, threshold };
}

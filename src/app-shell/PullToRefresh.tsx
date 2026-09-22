"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import {
  PULL_THRESHOLD_PX,
  REFRESH_GIVE_UP_MS,
  isPullReady,
  pullDistance,
  remainingVisibleMs,
} from "./pull-to-refresh";

type PullToRefreshProps = {
  scrollRef: RefObject<HTMLElement | null>;
  /** Routes de lecture seulement (`allowsPullToRefresh`). */
  enabled: boolean;
};

/**
 * Tirer pour rafraîchir (05 §4.3), en haut de la zone de défilement du shell.
 *
 * Le rafraîchissement est `router.refresh()` dans une transition : l'indicateur tourne tant que la
 * transition est en attente — c'est-à-dire jusqu'à ce que l'écran ait reçu et affiché ses données
 * fraîches — et au moins 300 ms. Plus jamais un délai fixe qui mentait sur un réseau lent.
 */
export function PullToRefresh({ scrollRef, enabled }: PullToRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const run = useRef<{ startedAt: number; sawPending: boolean; giveUp: number } | null>(null);

  const finish = useRef(() => {
    const current = run.current;
    if (!current) return;
    run.current = null;
    window.clearTimeout(current.giveUp);
    window.setTimeout(
      () => {
        refreshingRef.current = false;
        pullRef.current = 0;
        setRefreshing(false);
        setPull(0);
      },
      remainingVisibleMs(current.startedAt, performance.now()),
    );
  });

  // Fin réelle : la transition du rafraîchissement a été vue en attente, puis ne l'est plus.
  useEffect(() => {
    const current = run.current;
    if (!current) return;
    if (isPending) current.sawPending = true;
    else if (current.sawPending) finish.current();
  }, [isPending]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    let startY: number | null = null;
    let active = false;

    const apply = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };

    const onTouchStart = (e: TouchEvent) => {
      startY = refreshingRef.current || el.scrollTop > 0 ? null : (e.touches[0]?.clientY ?? null);
      active = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null || refreshingRef.current) return;
      const delta = (e.touches[0]?.clientY ?? startY) - startY;
      if (delta <= 0 || el.scrollTop > 0) {
        if (active) apply(0);
        active = false;
        return;
      }
      active = true;
      // Le doigt tire l'indicateur, pas la page : pas de rebond natif pendant le geste.
      if (e.cancelable) e.preventDefault();
      apply(pullDistance(delta));
    };

    const onTouchEnd = () => {
      const wasActive = active;
      active = false;
      startY = null;
      if (!wasActive) return;
      if (!isPullReady(pullRef.current)) {
        apply(0);
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      apply(PULL_THRESHOLD_PX);
      run.current = {
        startedAt: performance.now(),
        sawPending: false,
        giveUp: window.setTimeout(() => finish.current(), REFRESH_GIVE_UP_MS),
      };
      startTransition(() => router.refresh());
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
  }, [scrollRef, enabled, router]);

  if (pull <= 0 && !refreshing) return null;
  const ready = isPullReady(pull);

  return (
    <div
      aria-hidden
      data-ptr-indicator
      data-ptr-state={refreshing ? "refreshing" : ready ? "ready" : "pulling"}
      className="pointer-events-none absolute inset-x-0 top-0 z-[var(--admin-z-app-header)] flex justify-center"
      style={{
        transform: `translateY(${Math.max(0, pull - 36)}px)`,
        opacity: refreshing ? 1 : Math.min(1, pull / PULL_THRESHOLD_PX),
      }}
    >
      <span className="mt-2 flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-full)] border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-md)]">
        {refreshing ? (
          <Loader2 size={18} className="animate-spin text-[var(--admin-accent)]" />
        ) : (
          <ArrowDown
            size={18}
            className="text-[var(--admin-text-muted)]"
            style={{
              transform: ready ? "rotate(180deg)" : "none",
              transition: "transform var(--admin-duration-fast) var(--admin-easing-default)",
            }}
          />
        )}
      </span>
    </div>
  );
}

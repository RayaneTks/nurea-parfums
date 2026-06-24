"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

type PullToRefreshProps = {
  scrollRef: { current: HTMLElement | null };
};

/**
 * Indicateur pull-to-refresh ancré sous le header.
 * Recharge les données serveur via router.refresh().
 */
export function PullToRefresh({ scrollRef }: PullToRefreshProps) {
  const router = useRouter();

  const onRefresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        router.refresh();
        // Laisse l'indicateur visible un court instant pour le feedback.
        window.setTimeout(resolve, 600);
      }),
    [router],
  );

  const { pull, refreshing, threshold } = usePullToRefresh({ scrollRef, onRefresh });

  if (pull <= 0 && !refreshing) return null;

  const ready = pull >= threshold;
  const opacity = Math.min(1, pull / threshold);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-[var(--admin-z-app-header)] flex justify-center"
      style={{
        top: "var(--admin-header-height)",
        transform: `translateY(${Math.max(0, pull - 36)}px)`,
        opacity: refreshing ? 1 : opacity,
      }}
    >
      <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)] border border-[var(--admin-border)]">
        {refreshing ? (
          <Loader2 size={18} className="animate-spin text-[var(--admin-accent)]" />
        ) : (
          <ArrowDown
            size={18}
            className="text-[var(--admin-text-muted)] transition-transform duration-150"
            style={{ transform: ready ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        )}
      </div>
    </div>
  );
}

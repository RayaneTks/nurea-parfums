"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/** Seuil au-delà duquel on ne monte que les lignes visibles (+ marge). */
const VIRT_THRESHOLD = 48;
const OVERSCAN = 6;

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null;
  let el: HTMLElement | null = node.parentElement;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return el;
    }
    el = el.parentElement;
  }
  return document.getElementById("admin-scroll-root");
}

export type AdminWindowedListProps<T> = {
  items: readonly T[];
  itemKey: (item: T, index: number) => string | number;
  /** Hauteur estimée d'une ligne (px), hors gap. */
  estimateSize?: number;
  gap?: number;
  className?: string;
  listClassName?: string;
  role?: string;
  "aria-label"?: string;
  renderItem: (item: T, index: number) => ReactNode;
};

/**
 * Liste fenêtrée pour scroll parent admin (#admin-scroll-root).
 * Sous le seuil : rendu complet. Au-dessus : windowing + content-visibility.
 */
export function AdminWindowedList<T>({
  items,
  itemKey,
  estimateSize = 80,
  gap = 12,
  className,
  listClassName,
  role,
  "aria-label": ariaLabel,
  renderItem,
}: AdminWindowedListProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: items.length });

  const stride = estimateSize + gap;
  const useVirt = items.length >= VIRT_THRESHOLD;

  const updateRange = useCallback(() => {
    const root = rootRef.current;
    if (!root || items.length === 0) {
      setRange({ start: 0, end: 0 });
      return;
    }

    if (items.length < VIRT_THRESHOLD) {
      setRange({ start: 0, end: items.length });
      return;
    }

    const scrollParent = findScrollParent(root);
    const rootRect = root.getBoundingClientRect();

    let visibleTop: number;
    let viewportHeight: number;

    if (!scrollParent) {
      visibleTop = -rootRect.top;
      viewportHeight = window.innerHeight;
    } else {
      const parentRect = scrollParent.getBoundingClientRect();
      visibleTop = parentRect.top - rootRect.top;
      viewportHeight = scrollParent.clientHeight;
    }

    const visibleBottom = visibleTop + viewportHeight;
    const start = Math.max(0, Math.floor(visibleTop / stride) - OVERSCAN);
    const end = Math.min(items.length, Math.ceil(visibleBottom / stride) + OVERSCAN);

    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [items.length, stride]);

  useLayoutEffect(() => {
    updateRange();
  }, [updateRange, items]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scrollParent = findScrollParent(root);
    const scrollTarget: HTMLElement | Window = scrollParent ?? window;

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateRange);
    };

    scrollTarget.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    ro?.observe(root);
    if (scrollParent) ro?.observe(scrollParent);

    return () => {
      cancelAnimationFrame(raf);
      scrollTarget.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
    };
  }, [updateRange]);

  const { start, end } = range;
  const slice = useVirt ? items.slice(start, end) : items;

  const listStyle: CSSProperties | undefined = useVirt
    ? {
        paddingTop: start * stride,
        paddingBottom: Math.max(0, items.length - end) * stride,
      }
    : undefined;

  const itemContainStyle: CSSProperties = {
    contentVisibility: "auto",
    containIntrinsicSize: `auto ${estimateSize}px`,
  };

  return (
    <div ref={rootRef} className={cn("min-w-0", className)} role={role} aria-label={ariaLabel}>
      <div
        className={cn("flex min-w-0 flex-col", listClassName)}
        style={{ ...listStyle, gap: `${gap}px` }}
      >
        {slice.map((item, i) => {
          const index = useVirt ? start + i : i;
          return (
            <div key={itemKey(item, index)} style={useVirt ? itemContainStyle : undefined}>
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

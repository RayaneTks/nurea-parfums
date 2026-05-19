"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Ignoré — la modale est toujours en 100dvh CSS-only. */
  maxVh?: number;
};

/**
 * Modale full-viewport CSS-only — sans vaul, sans listener visualViewport.
 * position:fixed inset:0 height:100dvh, intérieur en flex column scrollable.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100%",
        zIndex: 70,
      }}
    >
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        className={cn(
          "mx-auto flex w-full max-w-[var(--admin-app-max-width)] flex-col bg-white",
          className,
        )}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: "100dvh",
          maxHeight: "100dvh",
        }}
      >
        {title ? (
          <div
            className="shrink-0 border-b border-neutral-200/70 px-5 pb-3 pt-3"
            style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
          >
            <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
            ) : null}
          </div>
        ) : null}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
          style={{
            WebkitOverflowScrolling: "touch",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

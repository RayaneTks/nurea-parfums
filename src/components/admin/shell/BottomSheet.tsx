"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Hauteur max en vh (defaut 88). */
  maxVh?: number;
};

/**
 * iOS-style bottom sheet avec swipe-to-dismiss (Vaul).
 *
 * - safe-area-inset-bottom respecté.
 * - Drag handle visible.
 * - Title accessible (aria-labelledby).
 * - 44px hitbox sur close button.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  maxVh = 88,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 z-[71] mx-auto flex max-w-[430px] flex-col rounded-t-2xl bg-white outline-none",
            className,
          )}
          style={{
            bottom: "var(--admin-keyboard-h, 0px)",
            maxHeight: `${maxVh}dvh`,
          }}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-neutral-300" aria-hidden />
          {title ? (
            <div className="border-b border-neutral-200/70 px-5 pb-3 pt-3">
              <Drawer.Title className="text-base font-semibold text-neutral-900">
                {title}
              </Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-0.5 text-xs text-neutral-500">
                  {description}
                </Drawer.Description>
              ) : null}
            </div>
          ) : null}
          <div
            className="flex-1 overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
          >
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

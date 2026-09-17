"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { fieldClass, scrollFieldIntoView } from "./field-behavior";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "elevated";
  /** Pas de recentrage au focus. */
  disableAutoScroll?: boolean;
}

/** Saisie multiligne. Libellé, aide et erreur : `FormField`. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { variant = "default", disableAutoScroll, className, rows = 3, onFocus, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      onFocus={(e) => {
        onFocus?.(e);
        if (!disableAutoScroll && !e.defaultPrevented) scrollFieldIntoView(e);
      }}
      className={cn(fieldClass(variant), "resize-none py-3", className)}
      {...rest}
    />
  );
});

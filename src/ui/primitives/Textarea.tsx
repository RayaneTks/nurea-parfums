"use client";

import { forwardRef, type FocusEvent, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Désactive le scrollIntoView au focus (utile dans listes virtualisées). */
  disableAutoScroll?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, disableAutoScroll, className, id, rows = 3, onFocus, ...rest },
  ref,
) {
  const autoId = useId();
  const taId = id ?? autoId;
  const helpId = error ? `${taId}-err` : hint ? `${taId}-hint` : undefined;

  const handleFocus = (e: FocusEvent<HTMLTextAreaElement>) => {
    onFocus?.(e);
    if (disableAutoScroll || e.defaultPrevented) return;
    const el = e.currentTarget;
    window.setTimeout(() => {
      try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        /* ignore */
      }
    }, 320);
  };

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={taId}
          className="mb-1.5 block text-[13px] font-medium text-[var(--admin-text-muted)]"
        >
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={taId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={helpId}
        onFocus={handleFocus}
        className={cn(
          "block w-full rounded-[12px]",
          "bg-[var(--admin-surface)] border border-[var(--admin-border-strong)]",
          "px-4 py-3 text-[16px] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)]",
          "transition-[border-color,box-shadow] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
          "focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "resize-none",
          error
            ? "border-[var(--admin-danger)] focus-visible:border-[var(--admin-danger)] focus-visible:ring-[var(--admin-danger-bg)]"
            : null,
          className,
        )}
        {...rest}
      />
      {error ? (
        <p id={helpId} className="mt-1.5 text-[12px] font-medium text-[var(--admin-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={helpId} className="mt-1.5 text-[12px] text-[var(--admin-text-subtle)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

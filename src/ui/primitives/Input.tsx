"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
  /** Numeric tabular alignment (montants). */
  numeric?: boolean;
  /**
   * "default" — fond `--admin-surface` (à utiliser dans une page sur `--admin-bg`).
   * "elevated" — fond `--admin-surface-alt` (à utiliser dans une Sheet/Card sur `--admin-surface`).
   */
  variant?: "default" | "elevated";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, trailingSlot, numeric, variant = "default", className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[13px] font-medium text-[var(--admin-text-muted)]"
        >
          {label}
        </label>
      ) : null}
      <div className="relative flex items-center">
        {leadingIcon ? (
          <div className="pointer-events-none absolute left-3 flex items-center text-[var(--admin-text-subtle)]">
            {leadingIcon}
          </div>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={helpId}
          className={cn(
            "block w-full min-h-[44px] rounded-[12px]",
            variant === "elevated"
              ? "bg-[var(--admin-surface-muted)] border border-[var(--admin-border-strong)]"
              : "bg-[var(--admin-surface)] border border-[var(--admin-border-strong)]",
            "px-4 text-[16px] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)]",
            "transition-[border-color,box-shadow] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
            "focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            leadingIcon ? "pl-10" : null,
            trailingSlot ? "pr-12" : null,
            error
              ? "border-[var(--admin-danger)] focus-visible:border-[var(--admin-danger)] focus-visible:ring-[var(--admin-danger-bg)]"
              : null,
            numeric ? "tnum text-right" : null,
            className,
          )}
          {...rest}
        />
        {trailingSlot ? (
          <div className="absolute right-2 flex items-center">{trailingSlot}</div>
        ) : null}
      </div>
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

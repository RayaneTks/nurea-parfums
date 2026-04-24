"use client";

import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  isSearch?: boolean;
  onClear?: () => void;
}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(function AdminInput(
  { label, hint, error, isSearch, onClear, className, value, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[13px] font-medium text-admin-muted"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        {isSearch ? (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-admin-subtle">
            <Search className="h-[18px] w-[18px]" aria-hidden />
          </div>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            "block w-full min-h-12 rounded-xl",
            "bg-admin-surface border border-admin-border shadow-admin-sm",
            "px-4 text-[16px] text-admin-text placeholder:text-admin-subtle",
            "transition-[border-color,box-shadow,color] duration-200 ease-out-expo admin-input-micro",
            "focus-visible:border-admin-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-admin-surface-muted",
            isSearch && "pl-11",
            onClear && value ? "pr-11" : undefined,
            error &&
              "border-[var(--admin-danger-border)] focus-visible:border-admin-danger focus-visible:ring-[var(--admin-danger-subtle)]",
            className,
          )}
          {...props}
        />
        {onClear && value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Effacer"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-admin-subtle transition-colors duration-200 [@media(hover:hover)]:hover:bg-admin-surface-muted [@media(hover:hover)]:hover:text-admin-text tap-scale"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-[12px] text-admin-danger font-medium">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-[12px] text-admin-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

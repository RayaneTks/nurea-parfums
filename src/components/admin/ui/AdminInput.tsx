"use client";

import { Search, X } from "lucide-react";
import { InputHTMLAttributes } from "react";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSearch?: boolean;
  onClear?: () => void;
}

export function AdminInput({
  label,
  error,
  isSearch,
  onClear,
  className = "",
  value,
  ...props
}: AdminInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-muted)]">{label}</label>
      )}
      <div className="group relative">
        {isSearch && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] transition-colors duration-200 group-focus-within:text-[var(--admin-accent-solid)]">
            <Search className="h-4 w-4" />
          </div>
        )}
        <input
          value={value}
          className={`
            block w-full min-h-[48px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)]
            px-4 text-[15px] text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/70
            transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
            focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/25
            disabled:opacity-40 disabled:cursor-not-allowed
            ${isSearch ? "pl-11" : ""}
            ${onClear && value ? "pr-11" : ""}
            ${error ? "border-[var(--admin-danger)] focus-visible:ring-[var(--admin-danger)]/20" : ""}
            ${className}
          `}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[var(--admin-muted)] transition-colors duration-200 hover:bg-[var(--admin-elevated)] hover:text-[var(--admin-text)] active:scale-90"
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[var(--admin-danger)]">{error}</p>}
    </div>
  );
}

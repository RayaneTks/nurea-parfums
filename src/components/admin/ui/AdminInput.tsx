"use client";

import { Search, X } from "lucide-react";
import { InputHTMLAttributes } from "react";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSearch?: boolean;
  onClear?: () => void;
}

/** Champ type iOS : fond fill, corps 17pt pour lisibilité. */
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
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--admin-secondary)]">{label}</label>
      )}
      <div className="group relative">
        {isSearch && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]">
            <Search className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          </div>
        )}
        <input
          value={value}
          className={`
            block w-full min-h-[48px] rounded-[10px] border border-transparent bg-[var(--admin-input-bg)]
            px-3 text-[17px] leading-snug text-[var(--admin-text)] placeholder:text-[var(--admin-tertiary)]
            transition-colors duration-150 ease-out
            focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/35
            disabled:opacity-38 disabled:cursor-not-allowed
            ${isSearch ? "pl-10" : ""}
            ${onClear && value ? "pr-10" : ""}
            ${error ? "border-[var(--admin-danger)] ring-2 ring-[var(--admin-danger)]/30" : ""}
            ${className}
          `}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-[var(--admin-muted)] transition-colors duration-150 hover:bg-[var(--admin-fill)] active:opacity-70"
            aria-label="Effacer"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[13px] font-medium text-[var(--admin-danger)]">{error}</p>}
    </div>
  );
}

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
        <label className="mb-1.5 block text-[13px] font-medium text-zinc-400">
          {label}
        </label>
      )}
      <div className="relative group">
        {isSearch && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-blue-500">
            <Search className="h-4 w-4" />
          </div>
        )}
        <input
          value={value}
          className={`
            block w-full min-h-[48px] rounded-xl bg-zinc-900/50 border border-zinc-800
            px-4 text-[15px] text-zinc-100 placeholder:text-zinc-600
            transition-all duration-200
            focus-visible:bg-zinc-900 focus-visible:border-blue-500/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10
            disabled:opacity-40 disabled:cursor-not-allowed
            ${isSearch ? "pl-11" : ""}
            ${onClear && value ? "pr-11" : ""}
            ${error ? "border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/10" : ""}
            ${className}
          `}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 active:scale-90 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
}

"use client";

import { forwardRef, type ChangeEvent, type InputHTMLAttributes, useId } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder?: string;
  ariaLabel?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, onClear, placeholder = "Rechercher…", ariaLabel, className, ...rest },
  ref,
) {
  const id = useId();
  return (
    <div
      className={cn(
        "relative flex items-center w-full h-[44px] rounded-[12px] bg-[var(--admin-surface)]",
        "border border-[var(--admin-border-strong)]",
        "focus-within:border-[var(--admin-accent)] focus-within:ring-4 focus-within:ring-[var(--admin-accent-ring)]",
        "transition-[border-color,box-shadow] duration-[var(--admin-duration-default)] ease-[var(--admin-easing-default)]",
        className,
      )}
    >
      <Search
        size={16}
        className="pointer-events-none absolute left-3 text-[var(--admin-text-subtle)]"
        aria-hidden
      />
      <input
        ref={ref}
        id={id}
        type="search"
        inputMode="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="block w-full bg-transparent pl-9 pr-9 py-2 text-[16px] outline-none placeholder:text-[var(--admin-text-subtle)]"
        {...rest}
      />
      {value.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          aria-label="Effacer la recherche"
          className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale hover:bg-[var(--admin-surface-muted)]"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
});

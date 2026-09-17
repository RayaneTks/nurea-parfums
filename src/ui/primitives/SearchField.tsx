"use client";

import { forwardRef, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (next: string) => void;
  onClear?: () => void;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Recherche avec effacement. Debounce et synchronisation d'URL : à l'appelant.
 *
 * Règle d'écran (05 §3.1) : le champ RESTE MONTÉ tant qu'un filtre est actif.
 * L'existant le masquait quand la liste filtrée passait sous le seuil
 * d'affichage — la recherche disparaissait précisément quand elle réussissait.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { value, onChange, onClear, placeholder = "Rechercher…", ariaLabel, className, onKeyDown, ...rest },
  ref,
) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };
  return (
    <div
      className={cn(
        "admin-transition relative flex h-[var(--admin-touch-min)] w-full items-center rounded-[var(--admin-radius-md)]",
        "border border-[var(--admin-border-strong)] bg-[var(--admin-surface)]",
        "focus-within:border-[var(--admin-accent)] focus-within:ring-4 focus-within:ring-[var(--admin-accent-ring)]",
        className,
      )}
    >
      <Search size={16} className="pointer-events-none absolute left-3 text-[var(--admin-text-subtle)]" aria-hidden />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          "admin-type-field block h-full w-full bg-transparent pl-9 text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)]",
          "focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden",
          value.length > 0 ? "pr-11" : "pr-3",
        )}
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
          className={cn(
            "tap-scale absolute right-0 inline-flex h-[var(--admin-touch-min)] w-[var(--admin-touch-min)] items-center justify-center rounded-[var(--admin-radius-md)]",
            "text-[var(--admin-text-subtle)] mouse-hover:text-[var(--admin-text)]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          )}
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
});

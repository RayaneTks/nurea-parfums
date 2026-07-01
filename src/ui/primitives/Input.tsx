"use client";

import {
  forwardRef,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Retire les zéros de tête d'une saisie numérique sans casser les décimales :
 * "060" → "60", "00" → "0", "0" → "0", "0,5" → "0,5", "" → "".
 * N'agit que sur une saisie strictement numérique (chiffres + un séparateur).
 */
function stripLeadingZeros(v: string): string {
  if (!/^\d*[.,]?\d*$/.test(v)) return v;
  return v.replace(/^0+(?=\d)/, "");
}

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
   * "elevated" — fond `--admin-surface` plus contrasté (Card/Sheet sur `--admin-bg`).
   */
  variant?: "default" | "elevated";
  /** Désactive le scrollIntoView au focus (utile dans listes virtualisées). */
  disableAutoScroll?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    leadingIcon,
    trailingSlot,
    numeric,
    variant = "default",
    disableAutoScroll,
    className,
    id,
    onFocus,
    onKeyDown,
    onChange,
    enterKeyHint,
    type,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  // Champs numériques : on nettoie les zéros de tête à la saisie (« 060 » → « 60 »)
  // pour que la valeur remontée au parent soit toujours propre.
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (numeric) {
      const cleaned = stripLeadingZeros(e.target.value);
      if (cleaned !== e.target.value) e.target.value = cleaned;
    }
    onChange?.(e);
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
    if (disableAutoScroll || e.defaultPrevented) return;
    const el = e.currentTarget;
    // Délai pour laisser le clavier mobile s'ouvrir (≈300ms) avant scroll.
    window.setTimeout(() => {
      try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        /* IE/Safari old: ignore */
      }
    }, 320);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key !== "Enter") return;
    // `textarea` n'arrive jamais ici (composant Input dédié <input>),
    // donc on peut intercepter Enter sans risque.
    const hint = enterKeyHint;
    if (hint === "next") {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const focusables = Array.from(
          form.querySelectorAll<HTMLElement>(
            "input:not([disabled]):not([type=hidden]), textarea:not([disabled]), select:not([disabled])",
          ),
        );
        const idx = focusables.indexOf(e.currentTarget);
        const next = idx >= 0 ? focusables[idx + 1] : undefined;
        if (next) {
          next.focus();
          return;
        }
      }
      e.currentTarget.blur();
      return;
    }
    // "done", "search", "send", "go", "enter" ou non précisé : ferme le clavier.
    e.preventDefault();
    e.currentTarget.blur();
  };

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
          type={type}
          enterKeyHint={enterKeyHint}
          aria-invalid={error ? true : undefined}
          aria-describedby={helpId}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          className={cn(
            "block w-full min-h-[44px] rounded-[12px]",
            variant === "elevated"
              ? "bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] shadow-[inset_0_0_0_1px_var(--admin-border)]"
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

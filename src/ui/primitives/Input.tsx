"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fieldClass, handleEnterKey, scrollFieldIntoView } from "./field-behavior";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
  /** Chiffres tabulaires alignés à droite. Pour un montant, préférer `MoneyInput`. */
  numeric?: boolean;
  /**
   * `default` — sur le fond de page. `elevated` — dans une carte ou une sheet,
   * avec un filet intérieur pour se détacher du blanc.
   */
  variant?: "default" | "elevated";
  /** Pas de recentrage au focus (listes fenêtrées). */
  disableAutoScroll?: boolean;
}

/**
 * Champ de saisie. Le libellé, l'aide et l'erreur viennent de `FormField`, qui
 * passe `id`, `aria-describedby` et `aria-invalid` : l'erreur se VOIT par la
 * bordure `danger` que porte `aria-invalid`, et se LIT par le message du champ.
 * Jamais de tremblement.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, trailingSlot, numeric, variant = "default", disableAutoScroll, className, onFocus, onKeyDown, enterKeyHint, ...rest },
  ref,
) {
  return (
    <div className="relative flex w-full items-center">
      {leadingIcon ? (
        <span className="pointer-events-none absolute left-3 flex items-center text-[var(--admin-text-subtle)]">
          {leadingIcon}
        </span>
      ) : null}
      <input
        ref={ref}
        enterKeyHint={enterKeyHint}
        onFocus={(e) => {
          onFocus?.(e);
          if (!disableAutoScroll && !e.defaultPrevented) scrollFieldIntoView(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          handleEnterKey(e, enterKeyHint);
        }}
        className={cn(fieldClass(variant), leadingIcon ? "pl-10" : null, trailingSlot ? "pr-12" : null, numeric ? "tnum text-right" : null, className)}
        {...rest}
      />
      {trailingSlot ? <span className="absolute right-1 flex items-center">{trailingSlot}</span> : null}
    </div>
  );
});

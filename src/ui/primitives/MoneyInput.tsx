"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { eur, formatEur, parseEurInput, toWire, type Eur } from "@/domain/money";
import { cn } from "@/lib/utils";
import { Chip } from "./Chip";
import { fieldClass, handleEnterKey, scrollFieldIntoView } from "./field-behavior";

export type QuickAmount = {
  /** « Tout », « La moitié », « Rien ». */
  label: string;
  amount: Eur;
};

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode" | "max" | "min" | "step"
> & {
  /** Le texte tel que saisi (« 12, » pendant la frappe reste possible). */
  value: string;
  /** Texte et montant lu (`null` tant que la saisie n'est pas un montant). */
  onChange: (text: string, amount: Eur | null) => void;
  /** Raccourcis en chips sous le champ ; celui qui vaut le montant saisi est actif. */
  quickAmounts?: readonly QuickAmount[];
  /** Plafond : au-delà, bordure `danger` et « 80,00 € au maximum » sous le champ. */
  max?: Eur;
  /** Accepte un montant négatif (mouvement de trésorerie). */
  signed?: boolean;
  /**
   * Touche Entrée d'une sheet d'argent : déclenche le CTA, SEULEMENT si le
   * montant est valide, positif et sous le plafond (06 §4.1). Sans elle,
   * Entrée ferme le clavier sans rien envoyer.
   */
  onSubmitAmount?: (amount: Eur) => void;
  variant?: "default" | "elevated";
  disableAutoScroll?: boolean;
};

/** Montant → texte de champ : « 1234,5 » devient « 1234,50 », « 120,00 » devient « 120 ». */
export function amountToInputText(amount: Eur): string {
  return toWire(amount).replace(/\.00$/, "").replace(".", ",").replace(/^-/, "−");
}

/** Ne garde que ce qu'un montant peut contenir : chiffres, un séparateur, espaces, signe. */
export function sanitizeMoneyText(text: string, signed = false): string {
  const kept = text.replace(signed ? /[^\d.,\s  \-−+]/g : /[^\d.,\s  ]/g, "");
  return kept;
}

export function exceedsMax(amount: Eur | null, max: Eur | undefined): boolean {
  return amount !== null && max !== undefined && eur.compare(amount, max) > 0;
}

/**
 * Saisie d'un montant en euros (05 §3.1) : clavier décimal, virgule et point
 * acceptés, chiffres tabulaires, « € » en suffixe. La lecture du texte est
 * celle du module monétaire (`parseEurInput`) — aucun `Number()` ici.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onChange,
    quickAmounts,
    max,
    signed = false,
    onSubmitAmount,
    variant = "default",
    disableAutoScroll,
    enterKeyHint,
    onKeyDown,
    onFocus,
    className,
    placeholder = "0",
    ...rest
  },
  ref,
) {
  const maxId = useId();
  const amount = parseEurInput(value, { signed });
  const over = exceedsMax(amount, max);
  const describedBy = [rest["aria-describedby"], over ? maxId : null].filter(Boolean).join(" ") || undefined;
  const hint = enterKeyHint ?? (onSubmitAmount ? "done" : undefined);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative flex items-center">
        <input
          ref={ref}
          {...rest}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint={hint}
          placeholder={placeholder}
          value={value}
          aria-invalid={over || rest["aria-invalid"] || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            const text = sanitizeMoneyText(e.target.value, signed);
            onChange(text, parseEurInput(text, { signed }));
          }}
          onFocus={(e) => {
            onFocus?.(e);
            if (!disableAutoScroll && !e.defaultPrevented) scrollFieldIntoView(e);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented || e.key !== "Enter") return;
            if (onSubmitAmount && amount !== null && !over && eur.compare(amount, eur.zero) > 0) {
              e.preventDefault();
              e.currentTarget.blur();
              onSubmitAmount(amount);
              return;
            }
            handleEnterKey(e, hint);
          }}
          className={cn(fieldClass(variant), "tnum pr-10 text-right")}
        />
        <span
          aria-hidden
          className="admin-type-field pointer-events-none absolute right-4 text-[var(--admin-text-muted)]"
        >
          €
        </span>
      </div>

      {over && max !== undefined ? (
        <p id={maxId} className="admin-type-caption mt-1.5 font-medium text-[var(--admin-danger)]">
          <span className="tnum">{formatEur(max)}</span> au maximum
        </p>
      ) : null}

      {quickAmounts && quickAmounts.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {quickAmounts.map((q) => (
            <Chip
              key={q.label}
              active={amount !== null && eur.compare(amount, q.amount) === 0}
              onClick={() => onChange(amountToInputText(q.amount), q.amount)}
            >
              {q.label}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
});

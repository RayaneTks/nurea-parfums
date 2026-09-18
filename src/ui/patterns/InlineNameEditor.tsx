"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../primitives/Button";
import { typeClass } from "../primitives/typography";

type InlineNameEditorProps = {
  value: string;
  /**
   * Enregistrement OPTIMISTE : le nouveau nom s'affiche aussitôt. Renvoyer
   * `false` ou lever une erreur restaure l'ancien nom — le toast qui dit
   * pourquoi est à la charge de l'appelant (`useAction`).
   */
  onSave: (next: string) => Promise<boolean | void> | boolean | void;
  minLength?: number;
  maxLength?: number;
  variant?: "h1" | "h2" | "h3" | "bodyEm";
  placeholder?: string;
  disabled?: boolean;
  /** « Renommer le lot ». */
  ariaLabel?: string;
  /**
   * Niveau de titre qui ENVELOPPE le nom, quand ce nom est le titre de l'écran (E06 : le lot lui-même).
   * Sans lui, l'écran n'a aucun titre dans l'arbre d'accessibilité — le nom n'est qu'un bouton, et la
   * navigation par titres de VoiceOver le saute. `variant` ne fait que la typographie ; ce sont deux
   * choses distinctes, et une sheet (S01) n'en a pas besoin : son titre est celui de la sheet.
   */
  headingLevel?: 1 | 2 | 3;
  className?: string;
};

/**
 * Tap sur le nom → champ ; Entrée ou ✓ enregistre, Échap ou ✕ annule (05 §3.2).
 */
export function InlineNameEditor({
  value,
  onSave,
  minLength = 2,
  maxLength = 120,
  variant = "h2",
  placeholder = "Sans nom",
  disabled = false,
  ariaLabel = "Modifier le nom",
  headingLevel,
  className,
}: InlineNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // La valeur du serveur fait foi dès qu'elle change.
  useEffect(() => {
    setOptimistic(null);
  }, [value]);

  useEffect(() => {
    if (!editing) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editing]);

  const shown = optimistic ?? value;
  const valid = draft.trim().length >= minLength && draft.trim().length <= maxLength;

  const cancel = useCallback(() => {
    setDraft(shown);
    setEditing(false);
  }, [shown]);

  const commit = useCallback(async () => {
    const next = draft.trim();
    if (!valid) return;
    setEditing(false);
    if (next === shown.trim()) return;
    setOptimistic(next);
    try {
      const result = await onSave(next);
      if (result === false) setOptimistic(null);
    } catch {
      setOptimistic(null);
    }
  }, [draft, valid, shown, onSave]);

  /**
   * Le titre enveloppe les DEUX états : le plan de l'écran ne disparaît pas le temps d'un renommage.
   * `h1`/`h2`/`h3` en dur plutôt qu'une balise calculée : Tailwind et le lecteur de code les voient.
   */
  const heading = (content: ReactNode) => {
    if (headingLevel === 1) return <h1 className="min-w-0">{content}</h1>;
    if (headingLevel === 2) return <h2 className="min-w-0">{content}</h2>;
    if (headingLevel === 3) return <h3 className="min-w-0">{content}</h3>;
    return content;
  };

  if (editing) {
    return heading(
      <div className={cn("flex min-w-0 items-center gap-1", className)}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          maxLength={maxLength}
          enterKeyHint="done"
          aria-label={ariaLabel}
          className={cn(
            "min-w-0 flex-1 rounded-[var(--admin-radius-sm)] border border-[var(--admin-accent)] bg-[var(--admin-surface)] px-2 py-1",
            "text-[var(--admin-text)] outline-none ring-4 ring-[var(--admin-accent-ring)]",
            typeClass[variant],
          )}
        />
        {/* `text` et non `primary` : le seul bouton plein de l'écran reste son CTA. */}
        <Button variant="text" size="sm" iconOnly ariaLabel="Enregistrer le nom" disabled={!valid} onClick={() => void commit()}>
          <Check size={18} />
        </Button>
        <Button variant="ghost" size="sm" iconOnly ariaLabel="Annuler" onClick={cancel}>
          <X size={18} />
        </Button>
      </div>,
    );
  }

  const empty = shown.trim().length === 0;
  return heading(
    <button
      type="button"
      onClick={() => {
        if (disabled) return;
        setDraft(shown);
        setEditing(true);
      }}
      disabled={disabled}
      aria-label={`${ariaLabel} : ${empty ? placeholder : shown}`}
      className={cn(
        "group tap-scale admin-hit-target -mx-1.5 min-w-0 max-w-full gap-1.5 rounded-[var(--admin-radius-sm)] px-1.5 text-left",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        disabled ? "cursor-default" : "mouse-hover:bg-[var(--admin-surface-hover)]",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 truncate",
          typeClass[variant],
          empty ? "text-[var(--admin-text-subtle)]" : "text-[var(--admin-text)]",
        )}
      >
        {empty ? placeholder : shown}
      </span>
      {!disabled ? (
        // Visible au doigt : au tactile, pas de survol pour révéler l'affordance.
        <Pencil size={14} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
      ) : null}
    </button>,
  );
}

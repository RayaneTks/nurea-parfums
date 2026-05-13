"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

type InlineNameEditorProps = {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  /** Permet d'annuler avant save. */
  onCancel?: () => void;
  /** Min/max length pour validation. */
  minLength?: number;
  maxLength?: number;
  /** Variant typographique du nom en mode view. */
  variant?: "h1" | "h2" | "h3" | "bodyEm";
  /** Texte placeholder si valeur vide. */
  placeholder?: string;
  /** Désactive l'édition. */
  disabled?: boolean;
  /** ariaLabel pour le bouton d'édition. */
  ariaLabel?: string;
  className?: string;
};

const variantClass: Record<NonNullable<InlineNameEditorProps["variant"]>, string> = {
  h1: "text-[28px] font-bold leading-[1.15] tracking-[-0.01em]",
  h2: "text-[20px] font-semibold leading-tight",
  h3: "text-[16px] font-semibold leading-snug",
  bodyEm: "text-[15px] font-semibold leading-normal",
};

/**
 * Tap-to-edit pattern réutilisable : view ↔ edit avec save async.
 *
 * - View : texte + petit bouton pencil pour passer en edit.
 * - Edit : input + boutons check / x. Auto-focus, sélection texte.
 * - Submit : Entrée ou clic check. Cancel : Échap ou clic x.
 * - Si onSave throw → reste en mode edit, état error possible via parent.
 */
export function InlineNameEditor({
  value,
  onSave,
  onCancel,
  minLength = 2,
  maxLength = 120,
  variant = "h2",
  placeholder = "Sans nom",
  disabled = false,
  ariaLabel = "Modifier le nom",
  className,
}: InlineNameEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing]);

  const start = () => {
    if (disabled) return;
    setEditing(true);
  };

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
    onCancel?.();
  }, [value, onCancel]);

  const commit = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed.length < minLength || trimmed.length > maxLength) {
      return;
    }
    if (trimmed === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft, value, minLength, maxLength, onSave]);

  if (editing) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
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
          aria-label={ariaLabel}
          className={cn(
            "min-w-0 flex-1 rounded-[10px] border border-[var(--admin-accent)] bg-[var(--admin-surface)] px-2 py-1",
            "text-[var(--admin-text)] outline-none ring-4 ring-[var(--admin-accent-ring)]",
            variantClass[variant],
          )}
        />
        <button
          type="button"
          onClick={() => void commit()}
          disabled={saving || draft.trim().length < minLength}
          aria-label="Valider"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent)] text-white tap-scale disabled:opacity-40"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          aria-label="Annuler"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)] tap-scale"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  const displayText = value.trim().length > 0 ? value : placeholder;
  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-[8px] text-left",
        "tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        disabled ? "cursor-default" : "cursor-text hover:bg-[var(--admin-surface-muted)] px-1.5 -mx-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "min-w-0 truncate",
          variantClass[variant],
          value.trim().length === 0 ? "text-[var(--admin-text-subtle)]" : "text-[var(--admin-text)]",
        )}
      >
        {displayText}
      </span>
      {!disabled ? (
        <Pencil
          size={14}
          className="shrink-0 text-[var(--admin-text-subtle)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

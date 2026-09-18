"use client";

import { useId, type ReactNode } from "react";

export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FormFieldProps = {
  label: string;
  /** Astérisque après le libellé. */
  required?: boolean;
  /** Aide sous le champ. */
  hint?: ReactNode;
  /**
   * Message d'erreur, prioritaire sur l'aide : actionnable et en français
   * (« 80,00 € au maximum », « Ce numéro est déjà celui de Lina. »).
   */
  error?: ReactNode;
  /** Identifiant du contrôle quand il n'est pas passé par la fonction enfant. */
  htmlFor?: string;
  /**
   * Fonction qui reçoit `id`, `aria-describedby` et `aria-invalid` à étaler sur
   * le contrôle (`<Input {...field} />`) — c'est ce qui relie libellé, message
   * et bordure d'erreur. Un nœud simple suppose `htmlFor`.
   */
  children: ReactNode | ((field: FieldControlProps) => ReactNode);
};

/** Champ labellisé (05 §3.2) : LE seul chemin pour un libellé, une aide, une erreur. */
export function FormField({ label, required = false, hint, error, htmlFor, children }: FormFieldProps) {
  const autoId = useId();
  const fieldId = htmlFor ?? autoId;
  const messageId = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="flex flex-col">
      {/*
        L'astérisque est DEHORS du `<label>` : dans le libellé, il entrerait dans le texte du champ
        (« Montant* »), et le champ deviendrait introuvable par son nom — pour un lecteur d'écran
        comme pour `npm run test:layout`, qui vise les champs par leur libellé exact. `aria-hidden`
        n'y suffisait pas : le texte d'un `<label>` reste le texte du `<label>` (relevé à J13).
      */}
      <span className="mb-1.5 flex items-baseline">
        <label htmlFor={fieldId} className="admin-type-caption font-medium text-[var(--admin-text-muted)]">
          {label}
        </label>
        {required ? (
          <span className="admin-type-caption ml-0.5 font-medium text-[var(--admin-danger)]" aria-hidden>
            *
          </span>
        ) : null}
      </span>
      {typeof children === "function"
        ? children({ id: fieldId, "aria-describedby": messageId, "aria-invalid": error ? true : undefined })
        : children}
      {error ? (
        <p id={messageId} className="admin-type-caption mt-1.5 font-medium text-[var(--admin-danger)]">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="admin-type-caption mt-1.5 text-[var(--admin-text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

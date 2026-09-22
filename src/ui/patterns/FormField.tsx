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
       * L'astérisque vit HORS du `<label>` : le texte du libellé reste exactement le libellé — celui qu'un test
       * d'écran vise (« Nom du parfum », jamais « Nom du parfum* ») et celui qu'annonce un lecteur d'écran.
       */}
      <span className="admin-type-caption mb-1.5 flex items-baseline font-medium text-[var(--admin-text-muted)]">
        <label htmlFor={fieldId}>{label}</label>
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

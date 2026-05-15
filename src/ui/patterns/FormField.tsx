"use client";

import { useId, type ReactNode } from "react";

type FormFieldProps = {
  label: string;
  /** Indique champ obligatoire (étoile rouge à droite du label). */
  required?: boolean;
  /** Aide affichée sous le champ (gris). */
  hint?: ReactNode;
  /** Message d'erreur (rouge, prioritaire sur hint). */
  error?: ReactNode;
  /**
   * Identifiant cible du label. Si non fourni, génère un id et le passe via
   * la fonction render `children`. Le composant input/select/textarea doit
   * recevoir l'id pour que le label l'associe correctement.
   */
  htmlFor?: string;
  /**
   * Soit un ReactNode statique (input avec id géré manuellement),
   * soit une render-function qui reçoit l'id + describedBy auto.
   */
  children: ReactNode | ((args: { id: string; "aria-describedby"?: string }) => ReactNode);
};

/**
 * Wrapper standard label + child + hint/error.
 *
 * Utile quand le composant enfant n'a pas déjà ses props label/hint/error
 * intégrées (custom select, switch, file picker, etc.). Pour `Input` /
 * `Textarea` qui supportent ces props nativement, utilise les props
 * directement plutôt que ce wrapper.
 */
export function FormField({
  label,
  required = false,
  hint,
  error,
  htmlFor,
  children,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = htmlFor ?? autoId;
  const helpId = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-[13px] font-medium text-[var(--admin-text-muted)]"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--admin-danger)]" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {typeof children === "function"
        ? children({ id: fieldId, "aria-describedby": helpId })
        : children}
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
}

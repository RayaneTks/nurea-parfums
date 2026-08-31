"use client";

import type { FC } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Ignoré quand `multiline` est vrai. */
  type?: "text" | "email" | "tel";
  error?: string;
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

/**
 * Champ de formulaire de la vitrine — libellé, contrôle, message d'erreur.
 *
 * Le style vit dans `.nurea-field` (`app/globals.css`) : filet 1 px, angles 0,
 * 48 px de haut, focus au filet cuivre. L'erreur bascule la bordure sur la
 * couleur d'alerte via `aria-invalid`, si bien que l'état visuel et l'état
 * annoncé aux lecteurs d'écran ne peuvent pas diverger.
 */
export const Field: FC<FieldProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  type = "text",
  error,
  autoComplete,
  multiline = false,
  rows = 5,
  className,
}) => {
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    value,
    autoComplete,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="nurea-caption mb-2 block text-nurea-muted">
        {label}
      </label>

      {multiline ? (
        <textarea
          {...shared}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className={cn("nurea-field resize-y", "min-h-[8rem]")}
        />
      ) : (
        <input
          {...shared}
          type={type}
          onChange={(event) => onChange(event.target.value)}
          className="nurea-field"
        />
      )}

      {error ? (
        <p id={errorId} role="alert" className="nurea-caption mt-2 text-nurea-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

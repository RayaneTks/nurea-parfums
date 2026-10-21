
import type { FC } from "react";
import { cn } from "@/lib/utils";

/**
 * L'habit d'un champ de saisie de la vitrine : celui du champ de recherche de la barre haute
 * (`SearchBox`), validé — `--surface-1`, filet `--line`, `--r-md`, 48 px. L'erreur passe le filet à
 * `--error` par `aria-invalid` : l'état vu et l'état annoncé ne peuvent pas diverger. Exporté pour
 * les champs qui ne passent pas par `Field` (la recherche de la page 404, sans JavaScript).
 */
export const FIELD_CLASS =
  "min-h-12 w-full rounded-md border border-line bg-surface-1 px-3 text-fg-1 transition-colors duration-dur-2 ease-soft placeholder:text-fg-3 aria-[invalid=true]:border-error";

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
 * Champ de formulaire de la vitrine — libellé visible au-dessus, contrôle, erreur dessous, reliée au
 * contrôle par `aria-describedby`.
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
      <label htmlFor={id} className="t-body mb-2 block font-medium text-fg-2">
        {label}
      </label>

      {multiline ? (
        <textarea
          {...shared}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className={cn(FIELD_CLASS, "min-h-32 resize-y py-3 leading-[var(--leading-body)]")}
        />
      ) : (
        <input {...shared} type={type} onChange={(event) => onChange(event.target.value)} className={FIELD_CLASS} />
      )}

      {error ? (
        <p id={errorId} className="t-caption mt-2 text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
};

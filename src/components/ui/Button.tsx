import { useId, type ButtonHTMLAttributes, type FC } from "react";
import { cn } from "@/lib/utils";

/**
 * Boutons de la vitrine — DESIGN.md § États, 04-PLAN-EXECUTION § B.8.
 *
 * Trois variantes, pas une de plus :
 *   · `solid`   — primaire. **Un seul par écran.**
 *   · `outline` — secondaire : `--surface-1`, filet `--line`.
 *   · `link`    — tertiaire : texte seul, souligné au survol.
 *
 * Les huit états : repos, survol (pointeur fin, couleur seule), focus clavier (anneau global
 * `:focus-visible`), appui (`--press`) viennent des classes ; désactivé, chargement, erreur et
 * succès viennent des props de `Button`.
 *
 * `buttonClass` habille un `next/link` ou un `<a>` sans composant polymorphe. Ce module reste
 * sans `"use client"` : des pages serveur importent `buttonClass`.
 */
export type ButtonVariant = "solid" | "outline" | "link";

/* Forme commune : 48 px, `--r-md`, graisse 500. */
const BOX =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 font-medium transition-[background-color,color,transform] duration-dur-2 ease-soft active:duration-dur-1";

const VARIANTS: Record<ButtonVariant, string> = {
  solid: `${BOX} bg-fg-1 text-bg mouse-hover:bg-[var(--primary-hover)]`,
  outline: `${BOX} border border-line bg-surface-1 text-fg-1 mouse-hover:bg-surface-2`,
  link: "inline-flex min-h-11 items-center text-fg-1 underline-offset-4 mouse-hover:underline",
};

/* Désactivé : l'appui et le survol s'éteignent, la cible reste au clavier. */
const DISABLED: Record<ButtonVariant, string> = {
  solid: "cursor-not-allowed bg-surface-2 text-fg-3 mouse-hover:bg-surface-2 active:transform-none",
  outline: "cursor-not-allowed text-fg-3 mouse-hover:bg-surface-1 active:transform-none",
  link: "cursor-not-allowed text-fg-3 mouse-hover:no-underline",
};

export function buttonClass(variant: ButtonVariant = "outline", className?: string): string {
  return cn(VARIANTS[variant], className);
}

/** Durée d'affichage d'un succès (« Nom copié ») avant de revenir au libellé : à tenir par l'appelant. */
export const SUCCESS_MS = 1600;

const focusOnMount = (el: HTMLElement | null) => el?.focus();

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /**
   * `loading` : « … », largeur figée, inerte. `success` : le libellé devient `feedback`
   * (annoncé poliment ; l'appelant revient au repos après `SUCCESS_MS`). `error` : `feedback`
   * s'affiche sous le bouton, relié et focalisé.
   */
  state?: "loading" | "success" | "error";
  feedback?: string;
}

export const Button: FC<ButtonProps> = ({
  variant = "outline",
  state,
  feedback,
  disabled,
  className,
  type = "button",
  onClick,
  children,
  ...props
}) => {
  const errorId = useId();
  const inert = disabled || state === "loading";
  const showError = state === "error" && feedback;
  const label = state === "loading" ? "…" : state === "success" && feedback ? feedback : null;

  const button = (
    <button
      type={type}
      {...props}
      // `aria-disabled` plutôt que `disabled` : le bouton reste atteignable et lisible au clavier.
      aria-disabled={inert || undefined}
      aria-busy={state === "loading" || undefined}
      aria-describedby={showError ? errorId : props["aria-describedby"]}
      onClick={inert ? (event) => event.preventDefault() : onClick}
      className={cn(VARIANTS[variant], disabled && DISABLED[variant], className)}
    >
      {/* Libellé et état empilés dans la même case : la largeur ne bouge pas. */}
      <span className="grid">
        <span className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2", label && "invisible")}>
          {children}
        </span>
        <span aria-live="polite" className="col-start-1 row-start-1 inline-flex items-center justify-center">
          {label}
        </span>
      </span>
    </button>
  );

  if (!showError) return button;
  return (
    <span className="inline-flex flex-col items-stretch gap-2">
      {button}
      <span id={errorId} ref={focusOnMount} tabIndex={-1} className="t-caption text-error">
        {feedback}
      </span>
    </span>
  );
};

import type { ButtonHTMLAttributes, FC } from "react";
import { cn } from "@/lib/utils";

/**
 * Boutons de la vitrine — charte § 05.
 *
 * Trois variantes, pas une de plus :
 *   · `solid`   — aplat cuivre. **Un seul par écran.**
 *   · `outline` — filet cuivre 1 px.
 *   · `link`    — lien texte souligné.
 *
 * Hauteur 48 px, 44 px sur mobile. Angles 0, aucune ombre, transition
 * 160 ms sur la couleur seule (jamais de déplacement au survol) : ces règles
 * vivent dans `.nurea-btn` / `.nurea-btn-link` (`app/globals.css`).
 *
 * `buttonClass` existe pour habiller un `next/link` ou un `<a>` sans casser
 * le préchargement ni recréer un composant polymorphe.
 */
export type ButtonVariant = "solid" | "outline" | "link";

/* Forme commune (DESIGN.md § États) : 48 px, `--r-md`, graisse 500, appui `--press`. */
const BOX =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-6 font-medium transition-[background-color,transform] duration-dur-1 ease-soft";

const VARIANTS: Record<ButtonVariant, string> = {
  /** Primaire — un seul par écran. */
  solid: `${BOX} bg-fg-1 text-bg mouse-hover:bg-[var(--primary-hover)]`,
  /** Secondaire. */
  outline: `${BOX} border border-line bg-surface-1 text-fg-1 mouse-hover:bg-surface-2`,
  /** Tertiaire : texte seul, souligné au survol. */
  link: "inline-flex min-h-11 items-center text-fg-1 underline-offset-4 mouse-hover:underline",
};

export function buttonClass(
  variant: ButtonVariant = "outline",
  className?: string
): string {
  return cn(VARIANTS[variant], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button: FC<ButtonProps> = ({
  variant = "outline",
  className,
  type = "button",
  ...props
}) => <button type={type} className={buttonClass(variant, className)} {...props} />;

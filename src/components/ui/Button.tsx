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

const VARIANTS: Record<ButtonVariant, string> = {
  solid:
    "nurea-btn bg-nurea-accent text-nurea-on-accent hover:bg-nurea-accent-hover",
  outline:
    "nurea-btn border-nurea-accent text-nurea-accent hover:bg-nurea-accent-subtle",
  link: "nurea-btn-link",
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

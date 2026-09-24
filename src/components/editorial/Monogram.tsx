import type { FC } from "react";
import { cn } from "@/lib/utils";

/**
 * Le monogramme NP, dans la couleur du texte courant.
 *
 * Décoratif par nature : la marque est déjà nommée par la navigation et par le
 * titre de la page. Il est donc masqué aux lecteurs d'écran — un « NP » lu à
 * voix haute n'apprendrait rien à personne.
 *
 * La forme vient de `.nurea-monogram` (`app/globals.css`) ; la taille et la
 * teinte, de la classe passée ici (`w-24 text-nurea-accent`).
 */
export const Monogram: FC<{ className?: string }> = ({ className }) => (
  <span aria-hidden className={cn("nurea-monogram", className)} />
);

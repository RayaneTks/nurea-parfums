import type { FC } from "react";
import { cn } from "@/lib/utils";

/**
 * Le parcours de commande, en trois temps. Source unique : la page « La
 * parfumerie » et la page Contact l'affichent toutes deux, et une commande ne
 * doit pas se passer de deux façons selon la page où on l'a lue.
 */
const ETAPES = [
  { title: "Choisir", text: "Repérez votre parfum dans le catalogue." },
  { title: "Écrire", text: "Envoyez-le sur Snapchat : on confirme le prix et la disponibilité." },
  { title: "Recevoir", text: "Dans votre flacon Nuréa, en main propre à Marseille ou par envoi." },
] as const;

/**
 * Trois temps sous un filet chacun : empilés sur téléphone, sur une ligne dès 768 px. `<ol>` : le
 * lecteur d'écran annonce une suite ; aucun numéro affiché, l'ordre de lecture suffit.
 */
export const OrderSteps: FC<{ className?: string }> = ({ className }) => (
  <ol className={cn("grid gap-6 md:grid-cols-3", className)}>
    {ETAPES.map(({ title, text }) => (
      <li key={title} className="border-t border-line pt-4">
        <h3 className="t-subtitle">{title}</h3>
        <p className="t-body mt-1">{text}</p>
      </li>
    ))}
  </ol>
);

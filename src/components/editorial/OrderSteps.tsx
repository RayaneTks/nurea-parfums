import type { FC } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
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
 * Une ligne de temps : un filet cuivre, un repère carré par étape.
 *
 * Carré et non rond : angles 0 (charte § 04). Horizontale sur grand écran,
 * verticale sur téléphone — le filet suit toujours le sens de lecture.
 *
 * `<ol>` : c'est une suite, et le lecteur d'écran l'annonce comme telle ; les
 * numéros affichés doublent la numérotation native, ils sont donc masqués.
 */
export const OrderSteps: FC<{ className?: string }> = ({ className }) => (
  <ol className={cn("relative grid gap-10 md:grid-cols-3 md:gap-6", className)}>
    {/* Le filet : vertical, puis horizontal dès qu'il y a la place. */}
    <span aria-hidden className="absolute bottom-2 left-1 top-2 w-px bg-nurea-border-strong md:inset-x-0 md:bottom-auto md:top-1 md:h-px md:w-auto" />

    {ETAPES.map(({ title, text }, index) => (
      <li key={title} className="relative pl-10 md:pl-0 md:pt-10">
        <span aria-hidden className="absolute left-0 top-2 h-2 w-2 bg-nurea-accent md:top-0" />
        <ScrollReveal delay={index * 80}>
          <p aria-hidden className="nurea-label">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h3 className="nurea-name mt-2 text-nurea-text">{title}</h3>
          <p className="nurea-body mt-2 max-w-xs">{text}</p>
        </ScrollReveal>
      </li>
    ))}
  </ol>
);

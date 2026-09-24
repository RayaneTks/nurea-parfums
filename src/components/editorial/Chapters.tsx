import type { FC } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/utils";

export interface Chapter {
  title: string;
  /** Une phrase. Si elle en demande deux, c'est qu'il y a deux chapitres. */
  text: string;
}

/**
 * Chapitres numérotés « 01 · 02 · 03 », bord contre bord.
 *
 * La numérotation est celle de la charte elle-même : elle donne un ordre de
 * lecture et un repère visuel fort, là où trois intertitres en corps de texte
 * se lisaient comme un seul bloc gris.
 *
 * Téléphone : le numéro à gauche, le texte à droite — chaque chapitre tient
 * dans une rangée courte au lieu d'empiler numéro, titre et texte.
 */
export const Chapters: FC<{ chapters: readonly Chapter[]; className?: string }> = ({ chapters, className }) => (
  <ol className={cn("nurea-filets md:grid-cols-3", className)}>
    {chapters.map(({ title, text }, index) => (
      <li key={title} className="px-0 py-10 md:px-10 md:py-18 md:first:pl-0">
        <ScrollReveal
          delay={index * 80}
          className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 md:grid-cols-1 md:gap-y-10"
        >
          <span aria-hidden className="nurea-numeral">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="nurea-name text-nurea-text">{title}</h3>
            <p className="nurea-body mt-2">{text}</p>
          </div>
        </ScrollReveal>
      </li>
    ))}
  </ol>
);

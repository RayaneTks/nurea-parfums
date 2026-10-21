import type { FC } from "react";
import { EditorialPhoto, type EditorialPhotoName } from "@/components/editorial/EditorialPhoto";
import { cn } from "@/lib/utils";

/**
 * Le parcours de commande, en trois temps. Source unique : la page « La
 * parfumerie » et la page Contact l'affichent toutes deux, et une commande ne
 * doit pas se passer de deux façons selon la page où on l'a lue.
 */
const ETAPES: readonly { title: string; text: string; photo: EditorialPhotoName }[] = [
  { title: "Choisir", text: "Repérez votre parfum dans le catalogue.", photo: "choisir" },
  { title: "Écrire", text: "Envoyez-le sur Snapchat : on confirme le prix et la disponibilité.", photo: "ecrire" },
  { title: "Recevoir", text: "Dans votre flacon Nuréa, en main propre à Marseille ou par envoi.", photo: "recevoir" },
];

/**
 * Trois temps, chacun avec sa photo. Par défaut, une rangée par temps : la photo à gauche (2:3, 7 rem),
 * le titre et la phrase à droite — compact, lisible d'un coup d'œil sur téléphone. `wide` (La parfumerie)
 * : dès 768 px, trois colonnes, la photo au-dessus en 4:5. `<ol>` : le lecteur d'écran annonce une
 * suite ; aucun numéro affiché.
 */
export const OrderSteps: FC<{ wide?: boolean; className?: string }> = ({ wide = false, className }) => (
  <ol className={cn("grid gap-6", wide && "md:grid-cols-3", className)}>
    {ETAPES.map(({ title, text, photo }) => (
      <li key={title} className={cn("grid grid-cols-[min(7rem,40%)_minmax(0,1fr)] items-center gap-4", wide && "md:grid-cols-1 md:content-start md:items-start")}>
        <EditorialPhoto
          name={photo}
          sizes={wide ? "(min-width: 768px) 30vw, 112px" : "112px"}
          className={cn("aspect-[2/3] rounded-md", wide && "md:aspect-[4/5] md:rounded-lg")}
        />
        <div>
          <h3 className="t-subtitle">{title}</h3>
          <p className="t-body mt-1">{text}</p>
        </div>
      </li>
    ))}
  </ol>
);

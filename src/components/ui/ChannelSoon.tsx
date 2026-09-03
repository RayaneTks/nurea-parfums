import type { FC } from "react";
import { WhatsAppIcon } from "@/components/ui/Icons";

/**
 * Un canal de contact annoncé, pas encore ouvert.
 *
 * WhatsApp figurait partout sous forme de bouton, pointant vers un numéro de
 * démonstration : le client cliquait, croyait écrire à la boutique, et parlait
 * dans le vide. Retirer purement le canal effacerait une promesse que la
 * maison compte tenir ; le laisser cliquable, c'est mentir.
 *
 * D'où cette troisième voie : on le montre, on dit qu'il arrive, et rien n'est
 * cliquable. Un lien mort déçoit une fois puis fait douter du reste ; une
 * mention honnête ne coûte rien et prépare le terrain.
 *
 * Ce n'est délibérément pas un bouton désactivé. Un bouton qu'on ne peut pas
 * presser reste une impasse — il attire le doigt pour ne rien donner. Une
 * ligne de légende se lit et se laisse.
 *
 * Le jour où le numéro existe, il s'écrit dans `CONTACT.whatsapp` et les vrais
 * boutons reviennent : les appels à ce composant sont alors à retirer.
 */
export const ChannelSoon: FC<{ className?: string }> = ({ className }) => (
  <p className={`nurea-caption flex items-center gap-2 text-nurea-muted${className ? ` ${className}` : ""}`}>
    <WhatsAppIcon className="h-4 w-4 shrink-0" aria-hidden />
    WhatsApp — bientôt disponible
  </p>
);

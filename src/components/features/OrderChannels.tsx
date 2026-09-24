import type { FC, ReactNode } from "react";
import Link from "next/link";
import { CONTACT } from "@/lib/data";
import { contactHref, whatsappOrderUrl } from "@/lib/catalog/perfumePresentation";
import { buttonClass } from "@/components/ui/Button";
import { ChannelSoon } from "@/components/ui/ChannelSoon";
import { SnapchatIcon, WhatsAppIcon } from "@/components/ui/Icons";

interface OrderChannelsProps {
  perfume: string;
  brand: string;
  /** Liens supplémentaires, rendus après le formulaire (ex. « Voir la fiche du parfum »). */
  children?: ReactNode;
}

/**
 * Les moyens de commander un parfum : Snapchat, WhatsApp s'il est ouvert, le formulaire.
 *
 * Un seul composant pour le détail en surimpression ET la fiche parfum indexable. Ces appels à
 * l'action avaient déjà été recopiés trois fois, et les trois copies avaient divergé (voir
 * `PerfumeDialog`) : une quatrième copie aurait recommencé.
 *
 * Charte § 05 : Snapchat prend l'unique aplat de l'écran — c'est le seul canal ouvert —,
 * WhatsApp le filet, le formulaire le lien texte. Sans état ni effet : rendu serveur possible.
 */
export const OrderChannels: FC<OrderChannelsProps> = ({ perfume, brand, children }) => {
  /* `null` tant que le canal n'est pas ouvert — voir `CONTACT.whatsapp`. */
  const commandeWhatsApp = whatsappOrderUrl(perfume, brand);

  return (
    <div className="mt-3 flex flex-col items-start gap-3">
      <a
        href={CONTACT.snapchat}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass("solid", "w-full")}
      >
        <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
        Snapchat
      </a>

      {commandeWhatsApp ? (
        <a
          href={commandeWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("outline", "w-full")}
        >
          <WhatsAppIcon className="h-4 w-4 shrink-0" aria-hidden />
          WhatsApp
        </a>
      ) : (
        <ChannelSoon />
      )}

      <Link href={contactHref(perfume, brand)} className={buttonClass("link")}>
        Passer par le formulaire
      </Link>

      {children}
    </div>
  );
};

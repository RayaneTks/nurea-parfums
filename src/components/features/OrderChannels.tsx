import type { FC, ReactNode } from "react";
import Link from "next/link";
import { MENTION_FLACONS } from "@/lib/mentions";
import { contactHref, orderMessage, whatsappOrderUrl } from "@/lib/catalog/perfumePresentation";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/Icons";
import { SnapchatOrderButton } from "./SnapchatOrderButton";

interface OrderChannelsProps {
  perfume: string;
  brand: string;
  /** Alignement de la colonne (la fiche en surimpression centre tout sur téléphone). */
  className?: string;
  /** Liens supplémentaires, rendus après le formulaire (ex. « Voir la fiche du parfum »). */
  children?: ReactNode;
  /**
   * `false` : le bouton Snapchat n'est pas rendu ici sur téléphone, parce que l'appelant le tient
   * dans une barre collée en bas de l'écran (fiche en surimpression). Deux boutons pleins l'un
   * au-dessus de l'autre enfreindraient la charte, et le second ne servirait à rien.
   */
  primaryOnMobile?: boolean;
}

/**
 * Les moyens de commander un parfum : Snapchat, WhatsApp s'il est ouvert, le formulaire.
 * Fermé, WhatsApp n'est pas annoncé sur la fiche (gérant, 26/10/2026) : le « bientôt » vit sur Contact.
 *
 * Un seul composant pour le détail en surimpression ET la fiche parfum indexable. Ces appels à
 * l'action avaient déjà été recopiés trois fois, et les trois copies avaient divergé (voir
 * `PerfumeSheet`) : une quatrième copie aurait recommencé.
 *
 * Charte § 05 : Snapchat prend l'unique aplat de l'écran — c'est le seul canal ouvert —,
 * WhatsApp le filet, le formulaire le lien texte. Sans état ni effet : rendu serveur possible.
 */
export const OrderChannels: FC<OrderChannelsProps> = ({ perfume, brand, className, children, primaryOnMobile = true }) => {
  /* `null` tant que le canal n'est pas ouvert — voir `CONTACT.whatsapp`. */
  const commandeWhatsApp = whatsappOrderUrl(perfume, brand);

  return (
    <div className={cn("mt-3 flex flex-col items-start gap-3", className)}>
      <SnapchatOrderButton message={orderMessage([{ name: perfume, brand }])} className={primaryOnMobile ? undefined : "max-md:hidden"} />

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
      ) : null}

      <Link href={contactHref(perfume, brand)} className={buttonClass("link")}>
        Passer par le formulaire
      </Link>

      {children}

      {/* Toute surface qui montre un flacon et propose de le commander dit ce que l'on reçoit. */}
      <p className="t-caption mt-3 w-full border-t border-line pt-4">{MENTION_FLACONS}</p>
    </div>
  );
};

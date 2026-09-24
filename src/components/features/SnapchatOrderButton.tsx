"use client";

import { useState, type FC } from "react";
import { Check } from "lucide-react";
import { CONTACT } from "@/lib/data";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

interface SnapchatOrderButtonProps {
  perfume: string;
  brand: string;
  className?: string;
}

/**
 * « Commander sur Snapchat » — et le nom du parfum dans le presse-papiers.
 *
 * Snapchat n'accepte pas de message pré-rempli : le lien ouvre le profil, et le
 * client devait se souvenir du nom exact du parfum pour l'écrire — c'est
 * précisément là qu'une commande se perd (« le bleu de Versace, là »). Le geste
 * qui ouvre la conversation copie donc « Marque — Nom » ; il ne reste qu'à le
 * coller.
 *
 * On l'annonce AVANT le geste, dans la légende : copier sans prévenir surprend.
 * La copie est un bonus — si le navigateur la refuse, le lien s'ouvre quand même
 * et la légende ne prétend rien.
 *
 * Aplat plein : c'est l'unique bouton plein de la fiche (charte § 05).
 */
export const SnapchatOrderButton: FC<SnapchatOrderButtonProps> = ({ perfume, brand, className }) => {
  const [copied, setCopied] = useState(false);
  const reference = [brand, perfume].filter(Boolean).join(" — ");

  const copy = () => {
    // Pas de `preventDefault` : le lien s'ouvre dans tous les cas, la copie l'accompagne.
    navigator.clipboard?.writeText(reference).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <a
        href={CONTACT.snapchat}
        target="_blank"
        rel="noopener noreferrer"
        onClick={copy}
        className={buttonClass("solid", "w-full")}
      >
        <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
        Commander sur Snapchat
      </a>
      <p className="nurea-caption flex items-center justify-center gap-2 text-center" aria-live="polite">
        {copied ? (
          <>
            <Check size={14} strokeWidth={1.5} aria-hidden className="shrink-0 text-nurea-accent" />
            Nom copié : collez-le dans la conversation.
          </>
        ) : (
          "Le bouton copie aussi le nom du parfum."
        )}
      </p>
    </div>
  );
};

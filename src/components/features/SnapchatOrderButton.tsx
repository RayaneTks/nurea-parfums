"use client";

import { useEffect, useState, type FC } from "react";
import { Check } from "lucide-react";
import { CONTACT } from "@/lib/data";
import { SUCCESS_MS, buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

interface SnapchatOrderButtonProps {
  /** Le texte copié : `orderMessage(...)`, « Nom (Marque) », une ligne par parfum. */
  message: string;
  /** Libellé du bouton ; « Commander sur Snapchat » par défaut. */
  label?: string;
  /** Légende avant le geste ; elle annonce la copie. */
  hint?: string;
  className?: string;
}

/**
 * « Commander sur Snapchat » — et le message dans le presse-papiers.
 *
 * Snapchat n'accepte pas de message pré-rempli : le lien ouvre le profil, et le client devait se
 * souvenir du nom exact du parfum pour l'écrire — c'est là qu'une commande se perd. Le geste qui
 * ouvre la conversation copie donc « Nom (Marque) » ; il ne reste qu'à coller. Deux taps depuis la
 * grille : la carte, puis ce bouton.
 *
 * La copie est annoncée AVANT le geste, dans la légende : copier sans prévenir surprend. Succès
 * (§ B.8) : le libellé devient « Nom copié » pendant `SUCCESS_MS`, annoncé poliment. Si le
 * navigateur refuse la copie, le lien s'ouvre quand même et rien ne prétend le contraire.
 *
 * Aplat plein : c'est l'unique bouton primaire de l'écran.
 */
export const SnapchatOrderButton: FC<SnapchatOrderButtonProps> = ({
  message,
  label = "Commander sur Snapchat",
  hint = "Le bouton copie aussi le nom du parfum.",
  className,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), SUCCESS_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    // Pas de `preventDefault` : le lien s'ouvre dans tous les cas, la copie l'accompagne.
    navigator.clipboard?.writeText(message).then(
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
        data-copied={copied || undefined}
        className={buttonClass("solid", "w-full")}
      >
        {copied ? (
          <Check size={16} strokeWidth={1.5} className="shrink-0" aria-hidden />
        ) : (
          <SnapchatIcon className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span aria-live="polite">{copied ? "Nom copié" : label}</span>
      </a>
      <p className="t-caption text-center">
        {copied ? "Collez-le dans la conversation." : hint}
      </p>
    </div>
  );
};

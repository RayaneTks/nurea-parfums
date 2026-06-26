"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/ui/primitives/Button";

type ShareButtonProps = {
  text: string;
  title?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  /** Retour utilisateur (toast côté parent) : succès / copie / erreur. */
  onFeedback?: (message: string, type: "success" | "error") => void;
};

/**
 * Partage natif iOS (`navigator.share`) avec repli copie presse-papiers.
 * Idéal pour envoyer un récap commande / reçu au client (Snap, WhatsApp, SMS).
 */
export function ShareButton({
  text,
  title,
  label = "Partager",
  variant = "secondary",
  size = "md",
  fullWidth,
  onFeedback,
}: ShareButtonProps) {
  const share = async () => {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text });
        return;
      } catch (e) {
        // Annulation utilisateur → on ne signale rien.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await nav?.clipboard?.writeText(text);
      onFeedback?.("Copié — colle dans Snap / WhatsApp.", "success");
    } catch {
      onFeedback?.("Partage indisponible sur cet appareil.", "error");
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      leadingIcon={<Share2 size={16} />}
      onClick={() => void share()}
    >
      {label}
    </Button>
  );
}

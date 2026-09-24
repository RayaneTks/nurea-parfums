"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "../primitives/Button";

export type SharePayload = { title?: string; text: string; url?: string };

export type ShareOutcome = "shared" | "cancelled" | "copied" | "unavailable";

type ShareNavigator = Pick<Navigator, "share"> & { clipboard?: Pick<Clipboard, "writeText"> };

/**
 * Feuille de partage iOS si elle existe, sinon copie dans le presse-papiers.
 * Une annulation dans la feuille n'est pas un échec et ne déclenche pas la copie.
 */
export async function shareOrCopy(payload: SharePayload, nav: Partial<ShareNavigator> | undefined): Promise<ShareOutcome> {
  if (nav?.share) {
    try {
      await nav.share(payload);
      return "shared";
    } catch (e) {
      // DOMException n'hérite pas d'Error sur tous les moteurs : on lit le nom.
      if ((e as { name?: unknown } | null)?.name === "AbortError") return "cancelled";
      // Partage refusé par le système : on tente la copie.
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(payload.url ? `${payload.text}\n${payload.url}` : payload.text);
      return "copied";
    } catch {
      return "unavailable";
    }
  }
  return "unavailable";
}

type ShareButtonProps = {
  payload: SharePayload;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  /**
   * Retour à afficher en toast par l'appelant (le provider de toasts est dans
   * le shell, que `src/ui` n'importe pas) : « Message copié » après la copie de
   * repli, ou l'échec. Rien après un partage réussi ou annulé.
   */
  onFeedback?: (message: string, type: "success" | "error") => void;
  copiedMessage?: string;
};

/** Partage d'un récap, d'un reçu, d'une relance (05 §3.2). */
export function ShareButton({
  payload,
  label = "Partager",
  variant = "secondary",
  size = "md",
  fullWidth,
  disabled,
  onFeedback,
  copiedMessage = "Message copié",
}: ShareButtonProps) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const outcome = await shareOrCopy(payload, typeof navigator === "undefined" ? undefined : navigator);
      if (outcome === "copied") onFeedback?.(copiedMessage, "success");
      if (outcome === "unavailable") onFeedback?.("Partage indisponible sur cet appareil.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      isLoading={busy}
      disabled={disabled}
      leadingIcon={<Share2 size={16} />}
      onClick={() => void share()}
    >
      {label}
    </Button>
  );
}

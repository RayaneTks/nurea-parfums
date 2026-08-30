"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";

type ErrorBannerProps = {
  /** `null` masque le bandeau. */
  message: string | null;
  /** Fait défiler jusqu'au message à son apparition (defaut true). */
  scrollIntoView?: boolean;
};

/**
 * Bandeau d'erreur de formulaire.
 *
 * Centralisé pour que chaque écran signale l'échec de la même façon : les
 * formulaires historiques peignaient chacun leur variante en `rose-*`, hors
 * des jetons du thème.
 */
export function ErrorBanner({ message, scrollIntoView = true }: ErrorBannerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message || !scrollIntoView) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [message, scrollIntoView]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className="flex items-start gap-2.5 rounded-[14px] p-3"
      style={{
        background: "var(--admin-danger-bg)",
        border: "1px solid var(--admin-danger-border)",
      }}
    >
      <AlertCircle
        size={16}
        className="mt-px shrink-0 text-[var(--admin-danger)]"
        aria-hidden
      />
      <p className="text-[13px] font-medium leading-snug text-[var(--admin-danger)]">
        {message}
      </p>
    </div>
  );
}

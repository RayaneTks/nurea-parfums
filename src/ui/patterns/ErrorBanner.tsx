"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../primitives/Button";

type ErrorBannerProps = {
  /** Message français qui dit ce qui manque : « Chiffres indisponibles ». `null` masque le bandeau. */
  message: string | null;
  /** Geste de correction : un bouton « Réessayer ». */
  onRetry?: () => void;
  retryLabel?: string;
  /**
   * Fait défiler jusqu'au bandeau à son apparition — pour l'erreur d'un
   * formulaire soumis. Défaut false : un bloc en échec ne doit pas faire
   * sauter l'écran.
   */
  scrollIntoView?: boolean;
};

/**
 * Erreur d'un bloc ou d'une page, INLINE à l'emplacement de ce qui a échoué ;
 * le reste de l'écran vit (05 §5.1). Une erreur de chargement n'est jamais un
 * toast seul.
 */
export function ErrorBanner({ message, onRetry, retryLabel = "Réessayer", scrollIntoView = false }: ErrorBannerProps) {
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
      className="flex items-center gap-2.5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] py-1 pl-3 pr-1"
    >
      <AlertCircle size={16} className="shrink-0 text-[var(--admin-danger)]" aria-hidden />
      <p className="admin-type-caption min-w-0 flex-1 py-2 font-medium text-[var(--admin-danger)]">{message}</p>
      {onRetry ? (
        <Button variant="text" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

type ToastProps = {
  type?: ToastType;
  message: string;
  /** Millisecondes avant fermeture (défaut 3 s ; 5 s pour un « Annuler »). `0` : reste affiché. */
  duration?: number;
  onClose: () => void;
  /** Action unique : « Annuler », « Réessayer », « Recharger ». */
  actionLabel?: string;
  onAction?: () => void;
};

const icon: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

const toneClass: Record<ToastType, { border: string; icon: string }> = {
  success: { border: "border-[var(--admin-success-border)]", icon: "text-[var(--admin-success)]" },
  error: { border: "border-[var(--admin-danger-border)]", icon: "text-[var(--admin-danger)]" },
  info: { border: "border-[var(--admin-info-border)]", icon: "text-[var(--admin-info)]" },
};

/** Attribut posé sur le nœud du toast : les couches modales le reconnaissent (`isToastTarget`). */
export const TOAST_ATTRIBUTE = "data-admin-toast";

/**
 * Un appui (ou un focus) venu du toast n'est pas une « interaction extérieure » pour la sheet, la
 * confirmation ou la palette ouverte dessous : taper « Annuler » ne doit pas les fermer au passage.
 * À passer à `onPointerDownOutside` / `onInteractOutside` de chaque couche Radix ou vaul.
 */
export function isToastTarget(target: EventTarget | null): boolean {
  return typeof Element !== "undefined" && target instanceof Element && target.closest(`[${TOAST_ATTRIBUTE}]`) !== null;
}

/**
 * Notification transitoire. Rendue par le provider du shell, UNE à la fois,
 * au-dessus de la tab bar et du clavier (z `toast`) — jamais montée par une
 * feature (05 §3.1). Une erreur de CHARGEMENT n'est jamais un toast seul :
 * c'est un `ErrorBanner`.
 */
export function Toast({ type = "success", message, duration = 3000, onClose, actionLabel, onAction }: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  /*
   * PORTALISÉ vers `<body>`, et non rendu là où il est écrit (05 §3.1, correction de production
   * `12e2327`). Deux défauts constatés à l'écran : une sheet ouverte transforme le conteneur de
   * l'app, et un descendant `position: fixed` s'ancre alors sur ce conteneur au lieu de la fenêtre
   * (le toast part de travers) ; et toute couche modale (sheet, confirmation, palette) pose
   * `pointer-events: none` sur `<body>` — le toast s'affichait par-dessus, mais ni sa croix ni
   * « Annuler », seul recours contre une suppression, ne répondaient. `pointer-events: auto` l'en
   * sort explicitement ; la bande `toast` le place au-dessus de toutes les couches.
   *
   * Avant l'hydratation `document` n'existe pas : rien n'est rendu plutôt qu'un balisage serveur que
   * le client déplacerait aussitôt.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const tone = toneClass[type];

  return createPortal(
    <div
      {...{ [TOAST_ATTRIBUTE]: "" }}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        // `.admin-theme` : police et couleur du thème, le portail sortant du conteneur de l'app.
        // Centré par marges, pas par translate : l'animation d'entrée réécrit
        // `transform` et décalait le toast d'une demi-largeur pendant 260 ms.
        "admin-theme pointer-events-auto fixed inset-x-0 z-[var(--admin-z-toast)] mx-auto flex w-[calc(100%-2rem)] items-center gap-3 py-1 pl-4 pr-1",
        "rounded-[var(--admin-radius-lg)] border bg-[var(--admin-surface)] shadow-[shadow:var(--admin-shadow-md)]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:[animation-duration:var(--admin-duration-slow)] motion-safe:[animation-timing-function:var(--admin-easing-default)]",
        tone.border,
      )}
      style={{
        maxWidth: "calc(var(--admin-app-max-width) - 2rem)",
        bottom: "calc(max(var(--admin-tab-bar-height), var(--admin-keyboard-inset, 0px)) + var(--admin-space-4))",
        // Aussi en ligne : la neutralisation de Radix est un style en ligne sur `<body>`.
        pointerEvents: "auto",
      }}
    >
      <span aria-hidden className={cn("shrink-0", tone.icon)}>
        {icon[type]}
      </span>
      <p className="admin-type-body min-w-0 flex-1 py-2.5 text-[var(--admin-text)]">{message}</p>
      {/*
        « Annuler » est souvent la dernière chance de rattraper une écriture :
        cible de 44 px, séparée de la croix — deux voisines aux effets opposés.
      */}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "tap-scale admin-hit-target shrink-0 rounded-[var(--admin-radius-md)] px-3 admin-type-body font-semibold text-[var(--admin-accent)]",
            "active:bg-[var(--admin-accent-bg)] mouse-hover:bg-[var(--admin-accent-bg)]",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
          )}
        >
          {actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className={cn(
          "tap-scale inline-flex h-[var(--admin-touch-min)] w-[var(--admin-touch-min)] shrink-0 items-center justify-center rounded-[var(--admin-radius-md)]",
          "text-[var(--admin-text-subtle)] active:bg-[var(--admin-surface-muted)] mouse-hover:bg-[var(--admin-surface-hover)]",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        )}
      >
        <X size={16} />
      </button>
    </div>,
    document.body,
  );
}

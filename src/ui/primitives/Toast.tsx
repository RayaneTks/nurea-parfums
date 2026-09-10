"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

type ToastProps = {
  type?: ToastType;
  message: string;
  duration?: number;
  onClose: () => void;
  /** Bouton d'action optionnel (ex. « Annuler »). */
  actionLabel?: string;
  onAction?: () => void;
};

const iconByType = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

const styleByType: Record<ToastType, { bg: string; fg: string; border: string }> = {
  success: { bg: "var(--admin-success-bg)", fg: "var(--admin-success)", border: "var(--admin-success)" },
  error: { bg: "var(--admin-danger-bg)", fg: "var(--admin-danger)", border: "var(--admin-danger)" },
  info: { bg: "var(--admin-info-bg)", fg: "var(--admin-info)", border: "var(--admin-info)" },
};

export function Toast({
  type = "success",
  message,
  duration = 3000,
  onClose,
  actionLabel,
  onAction,
}: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  /*
   * Le filet est PORTALISÉ vers `<body>`, et non rendu là où il est écrit.
   *
   * Deux raisons, toutes deux constatées à l'écran. Une feuille ouverte
   * applique une transformation au conteneur de l'application : un descendant
   * `position: fixed` s'y ancre alors sur ce conteneur transformé et non sur la
   * fenêtre — le filet partait se poser de travers. Et une couche modale pose
   * `pointer-events: none` sur le corps du document : le filet s'affichait bien
   * par-dessus la feuille, mais ne réagissait à aucun tap, ni sa croix, ni son
   * bouton « Annuler » — le seul recours contre une suppression.
   *
   * `pointerEvents: auto` le sort explicitement de cette neutralisation.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const s = styleByType[type];

  const node = (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "admin-theme fixed left-1/2 -translate-x-1/2 z-[var(--admin-z-toast)]",
        "flex items-start gap-3 rounded-[14px] px-4 py-3 shadow-[var(--admin-shadow-lg)]",
        "max-w-[min(92vw,400px)] w-full",
        "motion-safe:animate-in motion-safe:slide-in-from-bottom-4",
      )}
      style={{
        /*
         * Le clavier iOS pousse le filet, il ne le recouvre pas. Sans ce
         * rattrapage — le même que `StickyAction` — toute erreur signalée
         * pendant une saisie s'affichait derrière le clavier : « Montant > 0
         * requis », « Nom requis », « Impossible de modifier le nom » étaient
         * strictement invisibles, et l'utilisateur croyait son geste passé.
         */
        bottom:
          "calc(max(var(--admin-tab-bar-height), var(--admin-keyboard-inset, 0px)) + 16px)",
        background: "var(--admin-surface)",
        border: `1px solid ${s.border}`,
        pointerEvents: "auto",
      }}
    >
      <span style={{ color: s.fg }} aria-hidden className="shrink-0 mt-0.5">
        {iconByType[type]}
      </span>
      <p className="flex-1 text-[14px] leading-snug text-[var(--admin-text)]">{message}</p>
      {/*
        « Annuler » est souvent la dernière chance de rattraper une
        suppression. Il faisait 29 px de haut, à douze pixels d'une croix qui,
        elle, referme et laisse la suppression faite : deux cibles voisines,
        l'une trop petite, aux conséquences opposées. La cible passe à 44 px et
        l'écart entre les deux à 12 px.
      */}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="admin-hit-target mr-3 shrink-0 self-center rounded-lg px-3 text-[14px] font-semibold text-[var(--admin-accent)] tap-scale hover:bg-[var(--admin-accent-bg)]"
        >
          {actionLabel}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="-mr-1 shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--admin-text-subtle)] tap-scale hover:bg-[var(--admin-surface-muted)]"
      >
        <X size={16} />
      </button>
    </div>
  );

  // Avant l'hydratation, `document` n'existe pas : on ne rend rien plutôt que
  // de produire un balisage serveur que le client déplacerait aussitôt.
  return mounted ? createPortal(node, document.body) : null;
}

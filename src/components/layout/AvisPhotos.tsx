"use client";

import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatIcon } from "@/components/ui/Icons";
import { CONTACT } from "@/lib/data";

/** Fermée une fois, la fenêtre ne revient pas de la visite (onglet). */
const FERMEE_KEY = "nurea:avis-photos-ferme";

/**
 * Avis « photos indisponibles » (gérant, 23/10/2026 : le stockage des visuels a été coupé, quota
 * Supabase dépassé). Fenêtre discrète en bas d'écran, jamais bloquante : le catalogue reste lisible.
 *
 * Elle ne s'affiche que si un visuel du catalogue **ne charge réellement pas** : on sonde la première
 * image du stockage présente dans la page. Le jour où le stockage revient, la sonde réussit et l'avis
 * disparaît de lui-même, sans mise en ligne. Fermée, elle ne revient pas de la visite.
 */
export function AvisPhotos() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(FERMEE_KEY)) return;
    } catch {
      /* Stockage refusé : la fenêtre reste possible, simplement sans mémoire. */
    }
    const img = document.querySelector<HTMLImageElement>('img[src*=".supabase.co/storage/"], img[srcset*=".supabase.co/storage/"]');
    const url = img?.currentSrc || img?.src;
    if (!url || !url.includes(".supabase.co/storage/")) return;
    const sonde = new Image();
    sonde.onerror = () => setVisible(true);
    sonde.src = url;
  }, []);

  if (!visible) return null;

  const fermer = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(FERMEE_KEY, "1");
    } catch {
      /* rien */
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="enter fixed inset-x-0 bottom-0 z-toast px-4 pb-[max(var(--space-4),env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto flex max-w-md flex-col gap-3 rounded-lg border border-line bg-surface-1 p-4 shadow-[var(--shadow-float)]">
        <div className="flex flex-col gap-1">
          <p className="t-body font-semibold text-fg-1 [hyphens:manual]">Les photos des parfums sont momentanément indisponibles.</p>
          <p className="t-body text-fg-2 [hyphens:manual]">Nous rétablissons l&apos;affichage au plus vite. Une question&#8239;? Écrivez-nous sur Snapchat.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={CONTACT.snapchat} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "gap-2")}>
            <SnapchatIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            Nous écrire sur Snapchat
          </a>
          <button type="button" onClick={fermer} className={buttonClass("link")}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

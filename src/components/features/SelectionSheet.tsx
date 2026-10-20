"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { vitrineRoot } from "@/lib/vitrineRoot";
import { toggleSelection } from "@/lib/selection";
import { brandLineLabel, orderMessage } from "@/lib/catalog/perfumePresentation";
import { useSheetMotion } from "@/hooks/useSheetMotion";
import { useSelectionIds } from "@/hooks/useSelection";
import { buttonClass } from "@/components/ui/Button";
import { SnapchatOrderButton } from "./SnapchatOrderButton";
import { PerfumeImage } from "./PerfumeImage";

interface SelectionSheetProps {
  /** Le catalogue de la page : la sélection n'est qu'une liste d'identifiants sur l'appareil. */
  catalogue: readonly Perfume[];
  /** Toucher une ligne ouvre la fiche du parfum, par-dessus la feuille. */
  onOpenPerfume: (perfume: Perfume) => void;
  /** « Parcourir le catalogue » : fermer et amener la grille en vue. */
  onBrowse: () => void;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * « Ma sélection » (04-PLAN-EXECUTION § B.9, T13) : les parfums gardés d'un cœur, sur l'appareil
 * seulement — aucun compte, aucune écriture serveur. Un seul bouton commande le tout : il copie un
 * message « Nom (Marque) » par ligne et ouvre Snapchat.
 *
 * La feuille vit sur l'accueil, la seule page qui tient tout le catalogue : le cœur de la barre y
 * mène depuis les autres pages (`/?selection=1`). Un identifiant qui n'est plus au catalogue (parfum
 * retiré) est ignoré à l'affichage et dans le message, sans être effacé de l'appareil.
 */
const SheetContent: FC<SelectionSheetProps> = ({ catalogue, onOpenPerfume, onBrowse, onClose }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);
  const browse = useRef(false);

  useSheetMotion({
    open,
    onRequestClose: close,
    onClosed: () => {
      onClose();
      if (browse.current) onBrowse();
    },
    panelRef,
    scrimRef,
    scrollRef,
    desktop: "right",
  });

  const ids = useSelectionIds();
  const items = useMemo(() => {
    const byId = new Map(catalogue.map((perfume) => [perfume.id, perfume]));
    return ids.map((id) => byId.get(id)).filter((perfume): perfume is Perfume => Boolean(perfume));
  }, [catalogue, ids]);
  const count = items.length;

  /* Verrou de défilement, focus entrant, focus rendu au déclencheur. */
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    /* Le focus entre sans anneau : ouverte au doigt, la feuille n'a pas à afficher un état clavier. */
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ focusVisible: false } as FocusOptions);
    return () => {
      body.style.overflow = previousOverflow;
      trigger?.focus?.();
    };
  }, []);

  /* Retirer la dernière ligne sous le focus : il revient sur la fermeture, pas dans le vide. */
  const remove = (perfume: Perfume) => {
    toggleSelection(perfume.id);
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:justify-end">
      <div
        ref={scrimRef}
        aria-hidden
        className="absolute inset-0 bg-[color-mix(in_oklch,var(--bg)_85%,transparent)] opacity-0"
        onClick={close}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-selection-sheet
        onKeyDown={onKeyDown}
        className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-surface-1 shadow-float will-change-transform md:h-full md:max-h-none md:max-w-[25rem] md:rounded-none md:border-l md:border-line"
      >
        <header data-sheet-handle className="relative shrink-0 border-b border-line px-6 pb-4 pt-6">
          <span aria-hidden className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-fg-3 md:hidden" />
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="t-subtitle">Ma sélection</h2>
              <p className="t-caption mt-1" aria-live="polite">
                {count === 0 ? "Aucun parfum gardé" : `${count} parfum${count > 1 ? "s" : ""} gardé${count > 1 ? "s" : ""}`}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer ma sélection"
              className="press -mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-none">
          {count === 0 ? (
            /* État vide : une invitation, pas un constat. */
            <div className="flex flex-col items-start gap-4 px-6 py-8">
              <p className="t-body text-fg-1">Gardez ici les parfums qui vous tentent.</p>
              <p className="t-body">
                Touchez le cœur d&apos;un parfum&nbsp;: il vous attend ici. Vous les commandez ensuite
                ensemble, en un seul message.
              </p>
              <button
                type="button"
                onClick={() => {
                  browse.current = true;
                  close();
                }}
                className={buttonClass("solid", "w-full")}
              >
                Parcourir le catalogue
              </button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((perfume) => (
                <li key={perfume.id} className="flex items-center gap-4 border-b border-line px-6 py-3">
                  <button
                    type="button"
                    onClick={() => onOpenPerfume(perfume)}
                    aria-label={`${brandLineLabel(perfume.brand, perfume.line)} — ${perfume.name} : voir la fiche`}
                    className="press flex min-w-0 flex-1 items-center gap-4 rounded-md text-left transition-transform duration-dur-1 ease-soft"
                  >
                    <span className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-sm bg-surface-2">
                      <PerfumeImage perfume={perfume} sizes="48px" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="t-caption">{brandLineLabel(perfume.brand, perfume.line)}</span>
                      <span className="t-body text-pretty text-fg-1">{perfume.name}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(perfume)}
                    aria-label={`Retirer ${perfume.name} de ma sélection`}
                    className="press -mr-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-2 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
                  >
                    <X size={18} strokeWidth={1.5} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {count > 0 ? (
          <div className="glass border-t border-line px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <SnapchatOrderButton
              message={orderMessage(items)}
              label={count === 1 ? "Commander ce parfum sur Snapchat" : `Commander ces ${count} parfums sur Snapchat`}
              hint={count === 1 ? "Le bouton copie aussi le nom du parfum." : "Le bouton copie aussi la liste des parfums."}
              copiedLabel={count === 1 ? "Nom copié" : "Liste copiée"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const SelectionSheet: FC<SelectionSheetProps> = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  // Dans le bloc de la vitrine, pas dans <body> : sinon la feuille perd ses polices (`vitrineRoot`).
  return createPortal(<SheetContent {...props} />, vitrineRoot());
};

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { vitrineRoot } from "@/lib/vitrineRoot";
import { ambientStyle } from "@/lib/catalog/ambient";
import Link from "next/link";
import { X } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { useSheetMotion } from "@/hooks/useSheetMotion";
import { brandLineLabel } from "@/lib/catalog/perfumePresentation";
import { perfumePath } from "@/lib/seo/paths";
import { buttonClass } from "@/components/ui/Button";
import { OrderChannels } from "./OrderChannels";
import { SnapchatOrderButton } from "./SnapchatOrderButton";
import { PerfumeImage } from "./PerfumeImage";

interface PerfumeDialogProps {
  perfume: Perfume;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Détail d'un parfum en surimpression, ouvert depuis la grille de l'accueil.
 *
 * Il n'en existe qu'une instance, montée par la section catalogue ; la fiche en
 * grille ne fait que la demander. Les moyens de commande viennent d'`OrderChannels`,
 * partagé avec la fiche parfum indexable (`/parfums/<marque>/<parfum>`) : les mêmes
 * appels à l'action avaient été recopiés trois fois, et les trois copies avaient
 * divergé.
 *
 * Charte § 05 : angles 0, aucune ombre, séparation au filet.
 *
 * Téléphone — la fiche doit se lire comme une fiche, pas comme une visionneuse. La photo en 2:3
 * pleine largeur occupait 560 px sur 812 : nom et bouton de commande tombaient sous le pli, et
 * le geste « toucher un parfum » semblait n'ouvrir qu'un agrandissement. Désormais :
 *   - la photo est plafonnée (`max-h-[55dvh]`) : le nom apparaît sans défiler ;
 *   - « Commander sur Snapchat » est tenu dans une barre collée au bas de la feuille, hors de la
 *     zone qui défile : il reste visible quoi qu'on fasse ;
 *   - une poignée en haut dit que la feuille se ferme d'un glissé vers le bas.
 * Grand écran : inchangé, photo en 2:3 à gauche, tout le reste à droite.
 *
 * Mouvement (`useSheetMotion`) : la feuille entre par le bas et ressort par le bas, suit le doigt
 * dès qu'on la saisit — par la photo, ou n'importe où quand la fiche est en haut — et se laisse
 * rattraper pendant qu'elle bouge. Toute fermeture (bouton, Échap, fond, glissé) passe par la même
 * sortie animée ; `onClose` n'est appelé qu'une fois la feuille sortie.
 */
const DialogContent: FC<PerfumeDialogProps> = ({ perfume, onClose }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);

  useSheetMotion({
    open,
    onRequestClose: close,
    onClosed: onClose,
    panelRef,
    scrimRef,
    scrollRef,
    desktop: "rise",
  });

  /* Verrou de défilement, focus entrant, focus rendu au déclencheur. */
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      trigger?.focus?.();
    };
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
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

  const sheetHref = perfume.brandSlug ? perfumePath(perfume.brandSlug, perfume.name, perfume.id) : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
      {/* Le clic sur le fond ferme, comme attendu d'une boîte modale. Il ne
          porte aucune fonction propre : Échap et le bouton « Fermer » sont les
          chemins accessibles, ce fond n'est qu'un raccourci à la souris. */}
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
        onKeyDown={onKeyDown}
        style={ambientStyle(perfume)}
        className="amb relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-ambient shadow-float will-change-transform md:max-h-[88dvh] md:max-w-[52rem] md:rounded-sheet"
      >
        {/* La zone qui défile. La barre de commande, en dessous, n'en fait pas partie. */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Poignée et fermeture au-dessus du visuel, jamais posées dessus. Glisser ici ferme (téléphone). */}
          <div data-sheet-handle className="relative flex h-12 items-start justify-center pt-2">
            <span aria-hidden className="h-1 w-9 rounded-full bg-fg-3 md:hidden" />
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="press absolute right-2 top-1 flex h-11 w-11 items-center justify-center rounded-full text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <div className="flex flex-col gap-6 px-4 pb-6 md:grid md:grid-cols-2 md:items-center md:gap-8 md:px-8 md:pb-8">
            {/* Le visuel EN ENTIER (2:3, rien de rogné), dans la variante du thème. Sur téléphone, sa
                hauteur se plafonne à 56 % de l'écran pour que la marque et le nom suivent sans défiler. */}
            <div data-sheet-handle className="relative mx-auto aspect-[2/3] w-[min(100%,calc(56dvh*2/3))] overflow-hidden rounded-md bg-surface-2 md:w-full">
              <PerfumeImage perfume={perfume} sizes="(max-width: 767px) 90vw, 26rem" priority />
            </div>

            <div className="flex flex-col gap-2 text-center md:text-left">
              <p className="t-body">{brandLineLabel(perfume.brand, perfume.line)}</p>
              <h2 id={titleId} className="t-title">
                {perfume.name}
              </h2>
              <p className="t-body">Prix et disponibilité : écrivez-nous.</p>

              <OrderChannels perfume={perfume.name} brand={perfume.brand} primaryOnMobile={false} className="items-center md:items-start">
                {sheetHref ? (
                  <Link href={sheetHref} className={buttonClass("link")}>
                    Voir la fiche du parfum
                  </Link>
                ) : null}
              </OrderChannels>
            </div>
          </div>
        </div>

        {/* Téléphone : l'action principale, toujours à portée de pouce, sur la barre basse en verre
            (DESIGN.md § Matière, seconde surface permise). `safe-area` : au-dessus de la barre
            d'accueil de l'iPhone, jamais dessous. */}
        <div className="glass border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <SnapchatOrderButton perfume={perfume.name} brand={perfume.brand} />
        </div>
      </div>
    </div>
  );
};

export const PerfumeDialog: FC<PerfumeDialogProps> = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  // Dans le bloc de la vitrine, pas dans <body> : sinon la fiche perd ses polices (`vitrineRoot`).
  return createPortal(<DialogContent {...props} />, vitrineRoot());
};

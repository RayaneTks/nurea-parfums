"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { isCompleteRange } from "@/lib/catalog/perfumePresentation";
import { brandPath, perfumePath } from "@/lib/seo/paths";
import { buttonClass } from "@/components/ui/Button";
import { OrderChannels } from "./OrderChannels";
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
 */
const DialogContent: FC<PerfumeDialogProps> = ({ perfume, onClose }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

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
      onClose();
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

  /* Glisser vers le bas pour fermer — geste attendu d'une feuille mobile. */
  const onTouchStart = (event: ReactTouchEvent) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (event: ReactTouchEvent) => {
    const start = touchStartY.current;
    const end = event.changedTouches[0]?.clientY;
    touchStartY.current = null;
    if (start !== null && end !== undefined && end - start > 70) onClose();
  };

  /*
   * La fiche a une adresse à elle : c'est elle qu'on partage en story, et elle que Google indexe.
   *
   * La fiche-marque d'une gamme complète n'est pas un flacon : le catalogue la fabrique à partir de
   * la marque (même nom, identifiant synthétique), et son adresse est celle de la marque. Les
   * flacons réels d'une marque en gamme complète portent aussi la catégorie « gamme » — c'est le
   * nom, distinct de celui de la marque, qui les reconnaît.
   */
  const brandSheet = isCompleteRange(perfume) && perfume.name === perfume.brand;
  const sheetHref = perfume.brandSlug
    ? brandSheet
      ? brandPath(perfume.brandSlug)
      : perfumePath(perfume.brandSlug, perfume.name, perfume.id)
    : null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center">
      {/* Le clic sur le fond ferme, comme attendu d'une boîte modale. Il ne
          porte aucune fonction propre : Échap et le bouton « Fermer » sont les
          chemins accessibles, ce fond n'est qu'un raccourci à la souris. */}
      <div aria-hidden className="absolute inset-0 bg-nurea-bg/85" onClick={onClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-y-auto border-t border-nurea-border bg-nurea-bg md:max-h-[86dvh] md:max-w-[46rem] md:border"
      >
        <div className="md:grid md:grid-cols-2">
          <div
            className="nurea-visuel-parfum relative w-full border-b border-nurea-border md:border-b-0 md:border-r"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <PerfumeImage
              perfume={perfume}
              sizes="(max-width: 767px) 100vw, 23rem"
              priority
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center bg-nurea-bg text-nurea-text transition-colors duration-nurea ease-out hover:bg-nurea-surface-hover"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col p-6 md:p-8">
            <p className="nurea-label">{perfume.brand}</p>
            <h2 id={titleId} className="nurea-name mt-2 text-nurea-text">
              {perfume.name}
            </h2>

            <p className="nurea-caption mt-6">Écrivez-nous pour le prix et la disponibilité</p>

            <OrderChannels perfume={perfume.name} brand={perfume.brand}>
              {sheetHref ? (
                <Link href={sheetHref} className={buttonClass("link")}>
                  {brandSheet ? "Voir la page de la marque" : "Voir la fiche du parfum"}
                </Link>
              ) : null}
            </OrderChannels>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PerfumeDialog: FC<PerfumeDialogProps> = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(<DialogContent {...props} />, document.body);
};

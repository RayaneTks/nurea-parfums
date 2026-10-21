"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { vitrineRoot } from "@/lib/vitrineRoot";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ambientStyle } from "@/lib/catalog/ambient";
import Link from "next/link";
import { X } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { useSheetMotion } from "@/hooks/useSheetMotion";
import { VelocityTracker, rubberband } from "@/lib/motion/physics";
import { brandLineLabel, orderMessage } from "@/lib/catalog/perfumePresentation";
import { perfumePath } from "@/lib/seo/paths";
import { buttonClass } from "@/components/ui/Button";
import { OrderChannels } from "./OrderChannels";
import { SnapchatOrderButton } from "./SnapchatOrderButton";
import { PerfumeImage } from "./PerfumeImage";

interface PerfumeSheetProps {
  perfume: Perfume;
  /** La liste telle qu'affichée (filtres, tri) : précédent/suivant la parcourent. */
  sequence?: readonly Perfume[];
  /** Passer au parfum voisin (glissé horizontal, flèches du clavier). */
  onNavigate?: (perfume: Perfume) => void;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const SLOP_PX = 8;
/** Un glissé de côté change de parfum au-delà d'un quart de largeur, ou lancé vite. */
const SWIPE_RATIO = 0.25;
const SWIPE_VELOCITY = 300;

const reduced = () => window.matchMedia(REDUCED_QUERY).matches;
const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const cssMs = (name: string) => Number.parseFloat(cssVar(name)) || 0;
/** Courbe par défaut (§ B.7) ; un jeton vide ferait lever `animate()`. */
const easeOut = () => cssVar("--ease-out") || "ease";

/**
 * La fiche d'un parfum, en feuille depuis le bas, ouverte depuis la grille de l'accueil.
 *
 * Une seule instance, montée par la section catalogue, qui la pilote par l'adresse
 * (`?parfum=<id>`) : un lien partagé rouvre la même fiche. Les moyens de commande viennent
 * d'`OrderChannels`, partagé avec la fiche indexable (`/parfums/<marque>/<parfum>`).
 *
 * Téléphone — la fiche se lit comme une fiche, pas comme une visionneuse : le visuel 2:3 est
 * plafonné pour que marque et nom suivent sans défiler, « Commander sur Snapchat » tient dans la
 * barre basse en verre, hors de la zone qui défile (§ B.9). Grand écran : visuel à gauche, le reste
 * à droite.
 *
 * Mouvement — vertical (`useSheetMotion`) : entrée et sortie par le bas, la feuille suit le doigt
 * et ferme lancée au-delà de 0,11 px/ms ; bouton, Échap, fond et glissé passent par la même sortie,
 * `onClose` n'est appelé qu'une fois la feuille sortie. Horizontal (ici) : le contenu suit le doigt
 * et passe au parfum voisin, le fond prend la nouvelle ambiance. Mouvement réduit : fondus seuls.
 */
const SheetContent: FC<PerfumeSheetProps> = ({ perfume, sequence = [], onNavigate, onClose }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
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

  const index = sequence.findIndex((item) => item.id === perfume.id);
  const previous = index > 0 ? sequence[index - 1] : undefined;
  const next = index >= 0 ? sequence[index + 1] : undefined;

  /* Sens du dernier changement : le nouveau parfum entre du côté d'où vient le doigt. */
  const direction = useRef<1 | -1 | 0>(0);
  const navigate = useCallback(
    (target: Perfume | undefined, sign: 1 | -1) => {
      if (!target || !onNavigate) return false;
      direction.current = sign;
      onNavigate(target);
      return true;
    },
    [onNavigate]
  );
  const neighbours = useRef({ previous, next, navigate });
  useLayoutEffect(() => {
    neighbours.current = { previous, next, navigate };
  });

  /* Nouveau parfum : la lecture repart du haut, le contenu entre de son côté (fondu seul si réduit). */
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const sign = direction.current;
    direction.current = 0;
    if (!body || sign === 0) return;
    scrollRef.current?.scrollTo({ top: 0 });
    body.style.transform = "";
    const from = reduced() ? "none" : `translateX(${sign * 40}px)`;
    body.animate(
      [
        { transform: from, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: cssMs(reduced() ? "--dur-1" : "--dur-2"), easing: easeOut() }
    );
  }, [perfume.id]);

  /* Glissé horizontal au doigt. Le vertical appartient à `useSheetMotion`, qui laisse ce geste. */
  useEffect(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;
    if (!panel || !body) return;

    const tracker = new VelocityTracker();
    let startX = 0;
    let startY = 0;
    let state: "idle" | "deciding" | "horizontal" = "idle";

    const settle = (from: number) => {
      body.style.transform = "";
      if (from === 0 || reduced()) return;
      body.animate([{ transform: `translateX(${from}px)` }, { transform: "none" }], {
        duration: cssMs("--dur-2"),
        easing: easeOut(),
      });
    };

    const offsetFor = (dx: number) => {
      const { previous: before, next: after } = neighbours.current;
      const blocked = (dx > 0 && !before) || (dx < 0 && !after);
      return blocked ? rubberband(dx, panel.offsetWidth) : dx;
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        state = "idle";
        return;
      }
      const touch = event.touches[0]!;
      startX = touch.clientX;
      startY = touch.clientY;
      state = "deciding";
      tracker.reset();
      tracker.add(touch.clientX, event.timeStamp);
    };

    const onMove = (event: TouchEvent) => {
      if (state === "idle") return;
      const touch = event.touches[0]!;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      tracker.add(touch.clientX, event.timeStamp);

      if (state === "deciding") {
        if (Math.abs(dx) < SLOP_PX && Math.abs(dy) < SLOP_PX) return;
        state = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "idle";
        if (state === "idle") return;
        startX = touch.clientX; // part d'ici : pas de saut des 8 px de seuil
      }

      if (event.cancelable) event.preventDefault();
      if (!reduced()) body.style.transform = `translateX(${offsetFor(touch.clientX - startX)}px)`;
    };

    const onEnd = (event: TouchEvent) => {
      if (state !== "horizontal") {
        state = "idle";
        return;
      }
      state = "idle";
      const end = event.changedTouches[0]?.clientX ?? startX;
      const dx = end - startX;
      const velocity = event.type === "touchcancel" ? 0 : tracker.velocity(event.timeStamp);
      const far = Math.abs(dx) > panel.offsetWidth * SWIPE_RATIO;
      const fast = Math.abs(velocity) > SWIPE_VELOCITY && Math.sign(velocity) === Math.sign(dx);
      const { previous: before, next: after, navigate: go } = neighbours.current;

      if ((far || fast) && (dx < 0 ? go(after, 1) : go(before, -1))) return;
      settle(reduced() ? 0 : offsetFor(dx));
    };

    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd);
    panel.addEventListener("touchcancel", onEnd);
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
    };
  }, []);

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
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      if (event.key === "ArrowLeft" ? navigate(previous, -1) : navigate(next, 1)) event.preventDefault();
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
      {/* Le clic sur le fond ferme, comme attendu d'une boîte modale. Échap et « Fermer » sont les
          chemins accessibles ; ce fond n'est qu'un raccourci à la souris. */}
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
        data-perfume-sheet={perfume.id}
        onKeyDown={onKeyDown}
        style={ambientStyle(perfume)}
        className="amb relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-ambient shadow-float transition-[background-color] duration-dur-2 ease-soft will-change-transform md:max-h-[88dvh] md:max-w-[52rem] md:rounded-sheet"
      >
        {/* La zone qui défile. La barre de commande, en dessous, n'en fait pas partie. */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-none">
          {/* Poignée et fermeture au-dessus du visuel, jamais posées dessus. Glisser ici ferme (téléphone). */}
          <div data-sheet-handle className="relative flex h-12 items-start justify-center pt-2">
            <span aria-hidden className="h-1 w-9 rounded-full bg-fg-3 md:hidden" />
            <div className="absolute right-2 top-1 flex">
              {/* Voir le même parfum dans l'autre lumière, sans quitter la fiche. */}
              <ThemeToggle className="rounded-full" />
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="press flex h-11 w-11 items-center justify-center rounded-full text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
              >
                <X size={20} strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </div>

          <div
            ref={bodyRef}
            className="flex flex-col gap-6 px-4 pb-6 md:grid md:grid-cols-2 md:items-center md:gap-8 md:px-8 md:pb-8"
          >
            {/* Le visuel EN ENTIER (2:3, rien de rogné), dans la variante du thème. Pas une poignée : y
                glisser déroule ou remonte la fiche, comme partout ailleurs sous la barre du haut. Sur téléphone, sa
                hauteur se plafonne à 56 % de l'écran pour que la marque et le nom suivent sans défiler. */}
            <div className="relative mx-auto aspect-[2/3] w-[min(100%,calc(56dvh*2/3))] overflow-hidden rounded-md bg-surface-2 md:w-full">
              <PerfumeImage key={perfume.id} perfume={perfume} sizes="(max-width: 767px) 90vw, 26rem" priority />
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

          {/* Le changement de parfum au glissé s'annonce aussi à qui ne le voit pas. */}
          {index >= 0 && sequence.length > 1 ? (
            <p className="sr-only" aria-live="polite">
              {`${perfume.name}, ${index + 1} sur ${sequence.length}`}
            </p>
          ) : null}
        </div>

        {/* Téléphone : l'action principale, toujours à portée de pouce, sur la barre basse en verre
            (seconde surface de verre permise). `safe-area` : au-dessus de la barre d'accueil de
            l'iPhone, jamais dessous. */}
        <div className="glass border-t border-line px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <SnapchatOrderButton message={orderMessage([{ name: perfume.name, brand: perfume.brand }])} />
        </div>
      </div>
    </div>
  );
};

export const PerfumeSheet: FC<PerfumeSheetProps> = (props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  // Dans le bloc de la vitrine, pas dans <body> : sinon la fiche perd ses polices (`vitrineRoot`).
  return createPortal(<SheetContent {...props} />, vitrineRoot());
};

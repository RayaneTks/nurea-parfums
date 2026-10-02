"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import {
  SPRING_FLICK,
  SPRING_SETTLE,
  VelocityTracker,
  project,
  rubberband,
  springAtRest,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from "@/lib/motion/physics";

const MOBILE_QUERY = "(max-width: 767px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
/** Mouvement à parcourir avant de décider qui, de la feuille ou du défilement, prend le geste. */
const SLOP_PX = 8;
/** Au-delà, un glissé vers le bas ferme quelle que soit la distance parcourue. */
const DISMISS_VELOCITY = 400;
/** Grand écran : la boîte monte de 12 px en apparaissant — la seule montée que la charte admette. */
const RISE_PX = 12;
/** Mouvement réduit : la feuille se contente d'un fondu. Sans élan à transmettre, un ressort vif. */
const SPRING_FADE: SpringConfig = { damping: 1, response: 0.22 };
const SPRING_ENTER: SpringConfig = { damping: 1, response: 0.4 };

interface SheetMotionOptions {
  /** Ouvert ou fermé ; la feuille rejoint cet état depuis sa position affichée. */
  open: boolean;
  /** Le geste demande la fermeture (glissé vers le bas lâché assez loin, ou assez vite). */
  onRequestClose: () => void;
  /** La feuille a fini de sortir — le moment de la démonter. */
  onClosed?: () => void;
  panelRef: RefObject<HTMLElement | null>;
  scrimRef: RefObject<HTMLElement | null>;
  /** Zone qui défile : tant qu'elle n'est pas en haut, un glissé vers le bas la fait défiler. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Grand écran : boîte qui monte en fondu (`rise`) ou tiroir venu de la droite (`right`). */
  desktop: "rise" | "right";
}

const matches = (query: string) =>
  typeof window !== "undefined" && window.matchMedia(query).matches;

/**
 * Feuille qui se comporte comme un objet : elle suit le doigt, garde son élan, résiste au-delà
 * de son bord et se laisse rattraper en plein vol.
 *
 * Téléphone — elle entre par le bas et sort par le bas (même chemin dans les deux sens). On la
 * saisit par sa poignée (`data-sheet-handle`) ou n'importe où quand son contenu est en haut ;
 * lâchée, elle vise là où l'élan la portait, puis se pose sur un ressort qui reprend la vitesse
 * exacte du doigt : pas de couture entre le glissé et l'animation.
 *
 * Tout est piloté par une seule valeur, l'ouverture `p` (0 fermé, 1 ouvert, au-delà de 1 quand on
 * tire vers le haut), écrite directement dans le style : aucun rendu React par image.
 */
export function useSheetMotion({
  open,
  onRequestClose,
  onClosed,
  panelRef,
  scrimRef,
  scrollRef,
  desktop,
}: SheetMotionOptions): void {
  const spring = useRef<SpringState>({ value: 0, velocity: 0 });
  const target = useRef(0);
  const config = useRef<SpringConfig>(SPRING_ENTER);
  const frame = useRef<number | null>(null);
  const openRef = useRef(open);
  const callbacks = useRef({ onRequestClose, onClosed });
  callbacks.current = { onRequestClose, onClosed };
  openRef.current = open;

  /** Distance d'un bout à l'autre de la course, selon l'écran. */
  const distance = (panel: HTMLElement) => {
    if (matches(REDUCED_QUERY)) return 0;
    if (matches(MOBILE_QUERY)) return panel.offsetHeight || window.innerHeight;
    return desktop === "right" ? panel.offsetWidth || 400 : RISE_PX;
  };

  const apply = () => {
    const panel = panelRef.current;
    if (!panel) return;
    const p = spring.current.value;
    const visible = Math.min(Math.max(p, 0), 1);
    const travel = (1 - p) * distance(panel);
    const sideways = !matches(MOBILE_QUERY) && desktop === "right";
    const fades = matches(REDUCED_QUERY) || (!matches(MOBILE_QUERY) && desktop === "rise");

    panel.style.transform = sideways ? `translate3d(${travel}px,0,0)` : `translate3d(0,${travel}px,0)`;
    panel.style.opacity = fades ? String(visible) : "";
    panel.style.visibility = p <= 0.0005 && !openRef.current ? "hidden" : "";
    if (scrimRef.current) scrimRef.current.style.opacity = String(visible);
  };

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const run = () => {
    if (frame.current !== null) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      spring.current = stepSpring(spring.current, target.current, dt, config.current);
      if (springAtRest(spring.current, target.current)) {
        spring.current = { value: target.current, velocity: 0 };
        frame.current = null;
        apply();
        if (target.current === 0 && !openRef.current) callbacks.current.onClosed?.();
        return;
      }
      apply();
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  /** Repart toujours de la position et de la vitesse affichées : jamais de saut. */
  const animateTo = (next: number, springConfig: SpringConfig) => {
    target.current = next;
    config.current = matches(REDUCED_QUERY) ? SPRING_FADE : springConfig;
    run();
  };

  /* Fermée avant la première image : la feuille ne clignote pas en position ouverte. */
  useLayoutEffect(() => {
    apply();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    animateTo(open ? 1 : 0, open ? SPRING_ENTER : SPRING_SETTLE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Glissé au doigt — téléphone seulement. Écouteurs natifs, non passifs : le défilement de la
     page doit pouvoir être retenu au moment où la feuille prend le geste. */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const tracker = new VelocityTracker();
    let startY = 0;
    let startOffset = 0;
    let claimed = false;
    let abandoned = true;

    const onStart = (event: TouchEvent) => {
      abandoned = !openRef.current || !matches(MOBILE_QUERY) || event.touches.length > 1;
      if (abandoned) return;
      const y = event.touches[0]!.clientY;
      const moving = frame.current !== null;
      /* Rattrapée en plein vol : elle s'arrête sous le doigt, là où elle est. */
      stop();
      startY = y;
      startOffset = (1 - spring.current.value) * distance(panel);
      claimed = moving;
      if (claimed) spring.current = { ...spring.current, velocity: 0 };
      tracker.reset();
      tracker.add(y, event.timeStamp);
    };

    const onMove = (event: TouchEvent) => {
      if (abandoned) return;
      const y = event.touches[0]!.clientY;
      tracker.add(y, event.timeStamp);
      const dy = y - startY;

      if (!claimed) {
        if (Math.abs(dy) < SLOP_PX) return;
        const onHandle = (event.target as Element | null)?.closest("[data-sheet-handle]");
        const scroller = scrollRef?.current;
        const atTop = !scroller || scroller.scrollTop <= 0;
        if (!(onHandle || (dy > 0 && atTop))) {
          abandoned = true;
          return;
        }
        claimed = true;
        startY = y; // part d'ici : pas de saut des 8 px de seuil
        return;
      }

      if (event.cancelable) event.preventDefault();
      const height = distance(panel);
      if (height === 0) return;
      let offset = startOffset + dy;
      if (offset < 0) offset = rubberband(offset, height);
      spring.current = { value: 1 - offset / height, velocity: 0 };
      apply();
    };

    const onEnd = (event: TouchEvent) => {
      if (abandoned) return;
      abandoned = true;
      const height = distance(panel);

      if (height === 0) {
        /* Mouvement réduit : pas de suivi au doigt, un glissé franc ferme toujours. */
        const end = event.changedTouches[0]?.clientY;
        if (end !== undefined && end - startY > 70) callbacks.current.onRequestClose();
        return;
      }
      if (!claimed) return;

      const velocity = event.type === "touchcancel" ? 0 : tracker.velocity(event.timeStamp);
      const offset = (1 - spring.current.value) * height;
      const landing = offset + project(velocity);
      const dismiss =
        velocity > DISMISS_VELOCITY || (velocity > -DISMISS_VELOCITY && landing > height * 0.5);

      /* La vitesse du doigt devient celle du ressort, exprimée en ouvertures par seconde. */
      spring.current = { value: spring.current.value, velocity: -velocity / height };
      if (dismiss) {
        animateTo(0, SPRING_SETTLE);
        callbacks.current.onRequestClose();
      } else {
        animateTo(1, Math.abs(velocity) > 200 ? SPRING_FLICK : SPRING_SETTLE);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

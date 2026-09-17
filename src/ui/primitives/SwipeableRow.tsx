"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type SwipeActionTone = "success" | "warning" | "accent";

export type SwipeAction = {
  icon: ReactNode;
  /** Verbe d'action visible sous l'icône : « Livrer », « Encaisser ». */
  label: string;
  /** Pas de ton `danger` : un glissement n'est jamais destructif (05 §4.2). */
  tone: SwipeActionTone;
  /** Exécuté au TAP sur l'action révélée, jamais au seul glissement. */
  onAction: () => void;
};

type SwipeableRowProps = {
  /** Action de tête, révélée en glissant vers la droite. */
  leftAction?: SwipeAction;
  /** Action de queue, révélée en glissant vers la gauche. */
  rightAction?: SwipeAction;
  disabled?: boolean;
  /** La rangée : une `ListRow`. */
  children: ReactNode;
  className?: string;
};

/** Largeur d'une action révélée. */
export const SWIPE_ACTION_WIDTH = 88;
/** Distance avant de décider si le geste est horizontal ou un défilement. */
const INTENT_PX = 10;
/** Au-delà de la largeur de l'action, le contenu résiste. */
const RESISTANCE = 0.25;

export type SwipeState = "closed" | "left" | "right";

/**
 * Décalage affiché pour un déplacement du doigt : suit le doigt jusqu'à la
 * largeur de l'action, puis résiste. Nul du côté où aucune action n'existe.
 */
export function elasticOffset(
  dx: number,
  sides: { left: boolean; right: boolean },
  width = SWIPE_ACTION_WIDTH,
): number {
  if ((dx > 0 && !sides.left) || (dx < 0 && !sides.right)) return 0;
  const abs = Math.abs(dx);
  const eased = abs <= width ? abs : width + (abs - width) * RESISTANCE;
  return Math.sign(dx) * eased;
}

/** État au lâcher : ouvert si le doigt a passé la moitié de l'action. */
export function settleSwipe(offset: number, width = SWIPE_ACTION_WIDTH): SwipeState {
  if (offset >= width / 2) return "left";
  if (offset <= -width / 2) return "right";
  return "closed";
}

const offsetOf = (state: SwipeState, width = SWIPE_ACTION_WIDTH): number =>
  state === "left" ? width : state === "right" ? -width : 0;

const toneClass: Record<SwipeActionTone, string> = {
  success: "bg-[var(--admin-success)]",
  warning: "bg-[var(--admin-warning)]",
  accent: "bg-[var(--admin-accent)]",
};

/**
 * Glissement d'action sur une ligne — accélérateur, jamais le seul chemin.
 *
 * Règles (05 §4.2, 06 §4.2) : une action au plus par côté ; LE GLISSEMENT
 * RÉVÈLE, LE TAP EXÉCUTE — un défilement raté n'écrit jamais rien ; aucune
 * action destructive ; chaque action a un équivalent visible ailleurs. Liste
 * fermée des écrans : Commandes (À livrer, Livrées) et À encaisser.
 *
 * Le défilement vertical reste natif (`touch-action: pan-y`) : seul un geste
 * franchement horizontal est pris en charge.
 */
export function SwipeableRow({ leftAction, rightAction, disabled = false, children, className }: SwipeableRowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<SwipeState>("closed");
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    base: number;
    intent: "pending" | "horizontal" | "vertical";
  } | null>(null);
  const swallowClick = useRef(false);
  const sides = { left: leftAction !== undefined, right: rightAction !== undefined };

  const close = useCallback(() => setState("closed"), []);

  // Un tap ailleurs referme la rangée ouverte.
  useEffect(() => {
    if (state === "closed") return;
    const onDown = (e: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [state, close]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Un glissement n'est pas toujours suivi d'un clic : le drapeau ne doit pas
    // avaler le tap suivant.
    swallowClick.current = false;
    if (disabled || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, base: offsetOf(state), intent: "pending" };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId || g.intent === "vertical") return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.intent === "pending") {
      if (Math.abs(dy) > INTENT_PX && Math.abs(dy) >= Math.abs(dx)) {
        g.intent = "vertical";
        return;
      }
      if (Math.abs(dx) <= INTENT_PX || Math.abs(dx) < Math.abs(dy)) return;
      g.intent = "horizontal";
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDragOffset(elasticOffset(g.base + dx, sides));
  };

  const endGesture = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    if (g.intent !== "horizontal") return;
    swallowClick.current = true;
    setState(settleSwipe(dragOffset ?? g.base));
    setDragOffset(null);
  };

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    // Le clic qui suit un glissement, ou un tap sur une rangée ouverte, ne
    // traverse pas jusqu'à la rangée : il referme, il n'ouvre pas la fiche.
    if (swallowClick.current || state !== "closed") {
      e.preventDefault();
      e.stopPropagation();
      swallowClick.current = false;
      if (state !== "closed") close();
    }
  };

  const offset = dragOffset ?? offsetOf(state);

  const renderAction = (action: SwipeAction, side: "left" | "right") => (
    <button
      type="button"
      inert={state !== side}
      onClick={() => {
        close();
        action.onAction();
      }}
      style={{ width: SWIPE_ACTION_WIDTH }}
      className={cn(
        "absolute inset-y-0 flex flex-col items-center justify-center gap-1 text-[var(--admin-on-accent)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent-ring)]",
        side === "left" ? "left-0" : "right-0",
        toneClass[action.tone],
      )}
    >
      <span aria-hidden>{action.icon}</span>
      <span className="admin-type-micro font-semibold">{action.label}</span>
    </button>
  );

  return (
    <div ref={rootRef} className={cn("relative overflow-hidden", className)}>
      {leftAction ? renderAction(leftAction, "left") : null}
      {rightAction ? renderAction(rightAction, "right") : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClickCapture={onClickCapture}
        className={cn(
          "relative touch-pan-y select-none bg-[var(--admin-surface)] [-webkit-touch-callout:none]",
          dragOffset === null
            ? "[transition-property:transform] [transition-duration:var(--admin-duration-slow)] [transition-timing-function:var(--admin-easing-sheet)] motion-reduce:transition-none"
            : "transition-none",
        )}
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}

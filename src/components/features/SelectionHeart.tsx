"use client";

import { Heart } from "lucide-react";
import { useSyncExternalStore, type FC } from "react";
import { parseSelection, readSelectionRaw, subscribeSelection, toggleSelection } from "@/lib/selection";
import { cn } from "@/lib/utils";

interface SelectionHeartProps {
  id: number;
  /** Nom lu par le lecteur d'écran : « Ajouter Sauvage à ma sélection ». */
  name: string;
  className?: string;
}

/**
 * Cœur « Ma sélection » posé sur un visuel (DESIGN.md § Composants signature) : 44 px, cerclé de
 * `--surface-1` à 80 % pour rester lisible sur n'importe quelle photo. Rendu serveur = vide ;
 * l'état réel arrive à l'hydratation (la liste vit sur l'appareil).
 */
export const SelectionHeart: FC<SelectionHeartProps> = ({ id, name, className }) => {
  const selected = useSyncExternalStore(
    subscribeSelection,
    () => parseSelection(readSelectionRaw()).includes(id),
    () => false
  );

  return (
    <button
      type="button"
      onClick={() => toggleSelection(id)}
      aria-pressed={selected}
      aria-label={`${selected ? "Retirer" : "Ajouter"} ${name} ${selected ? "de" : "à"} ma sélection`}
      className={cn(
        "press flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--surface-1)_80%,transparent)] text-fg-1 transition-[background-color,transform] duration-dur-1 ease-soft mouse-hover:bg-surface-1",
        className
      )}
    >
      <Heart size={20} strokeWidth={1.5} fill={selected ? "currentColor" : "none"} aria-hidden />
    </button>
  );
};

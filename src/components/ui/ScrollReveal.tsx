"use client";

import type { ElementType, ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Décalage d'entrée, en millisecondes. À réserver aux blocs adjacents. */
  delay?: number;
  /** Balise rendue — permet de révéler une section sans envelopper d'un `div`. */
  as?: ElementType;
}

/**
 * Entrée au défilement : opacité et 12 px de montée, une seule fois.
 *
 * La charte n'admet aucun mouvement au survol et aucune entrée latérale ou
 * agrandie : il n'y a donc volontairement pas de variante de direction.
 */
export const ScrollReveal = ({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: ScrollRevealProps) => {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={cn("nurea-reveal", className)}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};

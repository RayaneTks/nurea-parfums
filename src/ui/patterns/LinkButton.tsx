"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "../primitives/Button";

/**
 * Un bouton qui mène à un écran (état vide, introuvable) — rendu par une page serveur.
 *
 * Vit ici et non dans une feature : le catalogue et les lots en ont tous deux besoin, et le projet
 * interdit un second jeu de composants admin hors de `src/ui` (CLAUDE.md). Déplacé de
 * `src/features/catalogue/components/` au jalon J13.
 */
export function LinkButton({ href, variant = "secondary", children }: { href: string; variant?: ButtonVariant; children: ReactNode }) {
  const router = useRouter();
  return (
    <Button variant={variant} onClick={() => router.push(href)}>
      {children}
    </Button>
  );
}

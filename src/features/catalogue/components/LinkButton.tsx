"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/ui/primitives/Button";

/** Un bouton qui mène à un écran (état vide, introuvable) — rendu par une page serveur. */
export function LinkButton({ href, variant = "secondary", children }: { href: string; variant?: ButtonVariant; children: ReactNode }) {
  const router = useRouter();
  return (
    <Button variant={variant} onClick={() => router.push(href)}>
      {children}
    </Button>
  );
}

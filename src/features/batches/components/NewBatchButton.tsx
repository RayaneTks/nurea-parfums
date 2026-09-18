"use client";

import { Plus } from "lucide-react";
import { useShellNavigation } from "@/app-shell/ShellNavigation";
import { routes } from "@/app-shell/routes";
import { Button } from "@/ui/primitives/Button";

/**
 * « Nouveau lot » (06 E05 zone 1) : l'action de création vit dans l'en-tête de la liste, jamais en FAB
 * (05 §3.2). Rendue avec le titre, sans attendre les lots.
 *
 * C'est le SEUL chemin visible vers E21 sur cet écran : le vide de départ le nomme au lieu d'ajouter
 * un second bouton (05 §5.3).
 */
export function NewBatchButton() {
  const { navigate } = useShellNavigation();
  return (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />} onClick={() => navigate(routes.nouveauLot())}>
      Nouveau lot
    </Button>
  );
}

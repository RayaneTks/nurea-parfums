"use client";

import { Plus } from "lucide-react";
import { useShellNavigation } from "@/app-shell/ShellNavigation";
import { routes } from "@/app-shell/routes";
import { Button } from "@/ui/primitives/Button";

/**
 * « Nouvelle commande » (06 E10 zone 1) : le composeur unique en mode Commande (arbitrage n°5), dans l'onglet
 * Vendre. Rendu avec le titre, sans attendre la liste.
 */
export function NewOrderButton() {
  const { navigate } = useShellNavigation();
  return (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />} onClick={() => navigate(routes.vendre({ mode: "commande" }))}>
      Nouvelle commande
    </Button>
  );
}

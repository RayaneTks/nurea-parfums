"use client";

import { Plus } from "lucide-react";
import { useShellNavigation } from "@/app-shell/ShellNavigation";
import { routes } from "@/app-shell/routes";
import { Button } from "@/ui/primitives/Button";

/** « Nouveau » (06 E12 zone 1) : le formulaire client. Rendu avec le titre, sans attendre la liste. */
export function NewCustomerButton() {
  const { navigate } = useShellNavigation();
  return (
    <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />} onClick={() => navigate(routes.nouveauClient())}>
      Nouveau
    </Button>
  );
}

import { Boxes } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { LinkButton } from "@/ui/patterns/LinkButton";

/**
 * E06 — lot introuvable (06 E06 « États ») : supprimé depuis un autre écran, ou adresse fabriquée. On
 * le dit, et on rend le chemin du retour — jamais un écran vide sans issue.
 */
export function BatchNotFound() {
  return (
    <EmptyState
      icon={Boxes}
      title="Ce lot n'existe plus"
      description="Il a peut-être été supprimé depuis un autre écran."
      action={<LinkButton href={routes.lots()}>Retour aux lots</LinkButton>}
    />
  );
}

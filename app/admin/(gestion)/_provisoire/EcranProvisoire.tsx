import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { EmptyState } from "@/ui/primitives/EmptyState";

/**
 * Racine d'onglet PROVISOIRE (07 J4) : le titre de l'écran et une ligne calme qui dit quand il
 * arrive. Rend la barre d'onglets navigable avant les écrans. Chaque usage disparaît au jalon cité
 * (07 J14 : `rg -n "Écran livré au jalon" src app` ne renvoie plus rien).
 */
export function EcranProvisoire({ titre, jalon }: { titre: string; jalon: string }) {
  return (
    <PageScaffold>
      <SectionHeader title={titre} />
      <EmptyState done title={`Écran livré au jalon ${jalon}.`} />
    </PageScaffold>
  );
}

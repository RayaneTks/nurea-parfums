import { Undo2 } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { perfumeSheet } from "@/server/catalogue/queries";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { LinkButton } from "@/ui/patterns/LinkButton";
import { PerfumeView } from "../components/PerfumeView";

/** E16 — fiche en consultation ; un parfum supprimé depuis ailleurs n'est pas une erreur, c'est un vide. */
export async function PerfumeSheetBlock({ id }: { id: number | null }) {
  const sheet = id === null ? null : await perfumeSheet(id);
  if (!sheet) {
    return (
      <EmptyState
        icon={Undo2}
        title="Ce parfum n'existe plus"
        description="Il a peut-être été supprimé depuis un autre écran."
        action={<LinkButton href={routes.catalogue()}>Retour au catalogue</LinkButton>}
      />
    );
  }
  return <PerfumeView sheet={sheet} />;
}

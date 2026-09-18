import { Undo2 } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { adminCatalogue, brandSheet } from "@/server/catalogue/queries";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { BrandForm } from "../components/BrandForm";
import { LinkButton } from "@/ui/patterns/LinkButton";

/** E17 — la marque à modifier (comptes des dialogues de cascade) et toutes les marques (dédoublonnage). */
export async function BrandFormBlock({ id }: { id: string | null }) {
  const [sheet, catalogue] = await Promise.all([id === null ? Promise.resolve(null) : brandSheet(id), adminCatalogue()]);
  if (id !== null && !sheet) {
    return (
      <EmptyState
        icon={Undo2}
        title="Cette marque n'existe plus"
        description="Elle a peut-être été supprimée depuis un autre écran."
        action={<LinkButton href={routes.catalogue({ tab: "marques" })}>Retour aux marques</LinkButton>}
      />
    );
  }
  return <BrandForm sheet={sheet} brands={catalogue.brands} />;
}

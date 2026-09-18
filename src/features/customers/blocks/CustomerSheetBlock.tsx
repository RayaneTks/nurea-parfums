import { Undo2 } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { LinkButton } from "@/features/catalogue/components/LinkButton";
import { aEncaisser, aEncaisserDetail } from "@/server/chiffres";
import { customerSheet } from "@/server/customers/queries";
import { activePockets } from "@/server/treasury/queries";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { CustomerView } from "../components/CustomerView";

/**
 * E14 — la fiche, son À encaisser (`aEncaisser(null, id)`, la définition), ses créances (celles de l'écran À
 * encaisser, filtrées sur la fiche) et les poches du moment pour « Encaisser ». Une fiche supprimée depuis ailleurs
 * n'est pas une panne : c'est un vide qui ramène à la liste.
 */
export async function CustomerSheetBlock({ id, pages }: { id: string; pages: string | null }) {
  const [sheet, due, receivables, pockets] = await Promise.all([
    customerSheet(id, pages),
    aEncaisser(null, id),
    aEncaisserDetail(),
    activePockets(),
  ]);
  if (!sheet) {
    return (
      <EmptyState
        icon={Undo2}
        title="Cette fiche n'existe plus"
        description="Elle a peut-être été supprimée depuis un autre écran."
        action={<LinkButton href={routes.clients()}>Retour aux clients</LinkButton>}
      />
    );
  }
  return (
    <CustomerView
      sheet={sheet}
      aEncaisser={due}
      receivables={receivables.filter((item) => item.customerId === sheet.customer.id)}
      pockets={pockets}
    />
  );
}

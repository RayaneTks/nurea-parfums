import { Undo2 } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { LinkButton } from "@/features/catalogue/components/LinkButton";
import { customerDirectory, customerForm } from "@/server/customers/queries";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { CustomerForm } from "../components/CustomerForm";

/** E20 — la fiche à modifier (hors cache) et l'annuaire des fiches (homonymes, numéro déjà pris). */
export async function CustomerFormBlock(props: { mode: "create"; nom: string } | { mode: "edit"; id: string }) {
  if (props.mode === "create") {
    const directory = await customerDirectory();
    return <CustomerForm mode="create" initialName={props.nom} directory={directory} />;
  }
  const [customer, directory] = await Promise.all([customerForm(props.id), customerDirectory()]);
  if (!customer) {
    return (
      <EmptyState
        icon={Undo2}
        title="Cette fiche n'existe plus"
        description="Elle a peut-être été supprimée depuis un autre écran."
        action={<LinkButton href={routes.clients()}>Retour aux clients</LinkButton>}
      />
    );
  }
  return <CustomerForm mode="edit" customer={customer} directory={directory} />;
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrderForm } from "@/features/orders/components/OrderForm";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Nouvelle commande",
  robots: { index: false, follow: false },
};

/**
 * Écran unique de création de commande.
 *
 * Il n'y a plus de variante `?mode=quick` : un seul formulaire, dont les
 * champs facultatifs (livraison, notes) sont repliés. Demander « rapide ou
 * détaillée ? » avant d'avoir saisi quoi que ce soit obligeait à choisir sans
 * information, et deux formulaires divergeaient à chaque évolution métier.
 * Les anciens liens `?mode=quick` restent valides et aboutissent ici.
 */
export default async function NewOrderPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const user = await verifyAdminToken(token);
  if (!user) redirect("/admin/login");

  return <OrderForm mode="create" />;
}

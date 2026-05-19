import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrderForm } from "@/components/admin/orders/OrderForm";
import { QuickOrderForm } from "@/components/admin/orders/QuickOrderForm";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Administration — Nouvelle Commande",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ mode?: string }>;

export default async function NewOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const user = await verifyAdminToken(token);
  if (!user) redirect("/admin/login");

  const { mode } = await searchParams;

  if (mode === "quick") {
    /* QuickOrderForm est self-contained (fixed + visualViewport-aware) :
       il gère son propre header/scroll/CTA. Pas de <main> wrapper qui
       interférerait avec la hauteur du conteneur parent forcée à
       window.visualViewport.height (directive UX clavier iOS). */
    return <QuickOrderForm />;
  }

  return <OrderForm mode="create" />;
}

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
    return (
      <main id="main-content" className="flex-1 space-y-4 px-5 pb-4 pt-2">
        <header>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-neutral-900">
            Commande rapide
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Client + 1 parfum + acompte (optionnel). 30 secondes.
          </p>
        </header>
        <QuickOrderForm />
      </main>
    );
  }

  return <OrderForm mode="create" />;
}

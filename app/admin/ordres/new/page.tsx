import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrderFullPageForm } from "@/components/admin/gestion/OrderFullPageForm";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Administration — Nouvelle Commande",
  robots: { index: false, follow: false },
};

export default async function NewOrderPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const user = await verifyAdminToken(token);
  if (!user) redirect("/admin/login");

  return <OrderFullPageForm mode="create" />;
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";
import { getAdminCatalogueSnapshot } from "@/lib/admin/getCatalogueSnapshot";

export const metadata: Metadata = {
  title: "Administration — Catalogue",
  robots: { index: false, follow: false },
};

export default async function AdminCataloguePage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    redirect("/admin/login");
  }

  const user = await verifyAdminToken(token);
  if (!user) {
    redirect("/admin/login");
  }

  const { brands, perfumes } = await getAdminCatalogueSnapshot();

  return (
    <AdminDashboard
      initialData={{
        user: { username: user.username, role: user.role },
        brands,
        perfumes,
      }}
    />
  );
}

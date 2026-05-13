import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NureaCatalogPage } from "@/components/admin/nurea/CatalogPage";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";
import { getCachedAdminCatalogue } from "@/lib/catalogue-service";

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

  const { brands, perfumes } = await getCachedAdminCatalogue();

  return (
    <NureaCatalogPage
      initialData={{
        user: { username: user.username, role: user.role },
        brands,
        perfumes,
      }}
    />
  );
}

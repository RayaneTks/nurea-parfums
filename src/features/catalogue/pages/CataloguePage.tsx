import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";
import { getCachedAdminCatalogue } from "@/lib/catalogue-service";
import { CatalogueClient } from "../components/CatalogueClient";

export async function CataloguePage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/admin/login");

  const user = await verifyAdminToken(token);
  if (!user) redirect("/admin/login");

  const { brands, perfumes } = await getCachedAdminCatalogue();

  return (
    <CatalogueClient
      initialData={{
        user: { username: user.username, role: user.role },
        brands,
        perfumes,
      }}
    />
  );
}

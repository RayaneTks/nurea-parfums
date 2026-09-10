import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";
import { getCachedAdminCatalogue } from "@/lib/catalogue-service";
import { countMediaByPerfume } from "@/server/catalogue/media";
import { CatalogueClient } from "../components/CatalogueClient";

export async function CataloguePage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/admin/login");

  const user = await verifyAdminToken(token);
  if (!user) redirect("/admin/login");

  /*
   * Le décompte des visuels vit hors de l'instantané mis en cache du catalogue :
   * il change au rythme des dépôts, bien plus vite que les fiches, et le
   * remettre dedans invaliderait tout le catalogue à chaque visuel ajouté.
   */
  const [{ brands, perfumes }, mediaCounts] = await Promise.all([
    getCachedAdminCatalogue(),
    countMediaByPerfume(),
  ]);

  return (
    <CatalogueClient
      initialData={{
        user: { username: user.username, role: user.role },
        brands,
        perfumes: perfumes.map((p) => ({ ...p, mediaCount: mediaCounts.get(p.id) ?? 0 })),
      }}
    />
  );
}

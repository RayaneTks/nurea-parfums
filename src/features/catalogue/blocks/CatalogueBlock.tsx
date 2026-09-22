import { adminCatalogue } from "@/server/catalogue/queries";
import { CatalogueLists } from "../components/CatalogueLists";

/** E15 — l'instantané admin (tag `admin-catalogue`) ; la liste se filtre ensuite sur l'appareil. */
export async function CatalogueBlock() {
  const catalogue = await adminCatalogue();
  return <CatalogueLists catalogue={catalogue} />;
}

import { revalidatePath, revalidateTag } from "next/cache";
import { tagFor } from "./cache-tags";

/**
 * Domaines de données touchés par une mutation.
 *
 * `commandes` et `ventes` entraînent systématiquement `kpi`, `pipeline` et
 * `tresorerie` : ce sont les mêmes euros, agrégés ailleurs. Oublier l'un des
 * trois donne un tableau de bord qui contredit l'écran d'où l'on vient.
 */
export type AdminDataScope =
  | "commandes"
  | "ventes"
  | "clients"
  | "lots"
  | "tresorerie";

const PATHS_BY_SCOPE: Record<AdminDataScope, readonly string[]> = {
  commandes: ["/admin", "/admin/ordres", "/admin/compta", "/admin/encaisser"],
  ventes: ["/admin", "/admin/compta", "/admin/encaisser", "/admin/lots"],
  clients: ["/admin/clients", "/admin/encaisser"],
  lots: ["/admin", "/admin/lots", "/admin/compta"],
  tresorerie: ["/admin", "/admin/compta"],
};

/**
 * Purge les caches après une mutation, par domaine métier.
 *
 * Les agrégats du tableau de bord et de la compta passent par `unstable_cache`
 * avec une durée de vie de 30 à 60 secondes. Sans invalidation explicite,
 * encaisser un paiement ou livrer une commande laissait les chiffres inchangés
 * jusqu'à une minute — l'app paraissait ignorer l'action qu'on venait de faire.
 *
 * La moitié des routes de mutation n'invalidaient rien du tout. Ce helper leur
 * donne un appel unique, difficile à oublier et impossible à faire à moitié.
 */
export function revalidateAdminData(
  scopes: readonly AdminDataScope[],
  ids?: { orderId?: string; saleId?: string; customerId?: string },
): void {
  const tags = new Set<string>();
  const paths = new Set<string>();

  for (const scope of scopes) {
    for (const path of PATHS_BY_SCOPE[scope]) paths.add(path);

    switch (scope) {
      case "commandes":
        tags.add(tagFor.orders());
        tags.add(tagFor.pipeline());
        tags.add(tagFor.kpi());
        tags.add(tagFor.treasury());
        break;
      case "ventes":
        tags.add(tagFor.sales());
        tags.add(tagFor.kpi());
        tags.add(tagFor.batches());
        tags.add(tagFor.treasury());
        break;
      case "clients":
        tags.add(tagFor.customers());
        break;
      case "lots":
        tags.add(tagFor.batches());
        tags.add(tagFor.kpi());
        break;
      case "tresorerie":
        tags.add(tagFor.treasury());
        tags.add(tagFor.kpi());
        break;
    }
  }

  if (ids?.orderId) {
    tags.add(tagFor.order(ids.orderId));
    paths.add(`/admin/ordres/${ids.orderId}`);
  }
  if (ids?.saleId) tags.add(tagFor.sale(ids.saleId));
  if (ids?.customerId) {
    tags.add(tagFor.customer(ids.customerId));
    paths.add(`/admin/clients/${ids.customerId}`);
  }

  // `expire: 0` : purge immédiate, sinon la page suivante peut encore servir
  // la valeur périmée.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  for (const path of paths) revalidatePath(path);
}

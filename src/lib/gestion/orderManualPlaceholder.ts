import type { PrismaClient } from "@prisma/client";

/** Slug réservé : parfum technique pour lignes « nom manuel » (hors catalogue site). */
export const ORDER_MANUAL_PERFUME_SLUG = "__nurea_order_hors_site__";
const ORDER_MANUAL_BRAND_SLUG = "__nurea_internal_orders__";

/**
 * Garantit l’existence d’une marque + parfum techniques pour les commandes avec libellé manuel.
 * Idempotent (safe à appeler sur chaque POST/PATCH commande).
 */
export async function ensureOrderManualPlaceholderPerfume(
  db: PrismaClient,
): Promise<{ id: number; name: string; image: string; brand: { id: string; name: string } }> {
  let brand = await db.brand.findUnique({ where: { slug: ORDER_MANUAL_BRAND_SLUG } });
  if (!brand) {
    brand = await db.brand.create({
      data: {
        name: "Interne commandes",
        slug: ORDER_MANUAL_BRAND_SLUG,
        catalogMode: "CURATED",
        status: "DRAFT",
      },
    });
  }

  const existing = await db.perfume.findUnique({
    where: { slug: ORDER_MANUAL_PERFUME_SLUG },
    select: {
      id: true,
      name: true,
      image: true,
      brand: { select: { id: true, name: true } },
    },
  });
  if (existing) return existing;

  const created = await db.perfume.create({
    data: {
      brandId: brand.id,
      name: "Hors catalogue (libellé manuel)",
      slug: ORDER_MANUAL_PERFUME_SLUG,
      image: "/placeholder.svg",
      status: "DRAFT",
    },
    select: {
      id: true,
      name: true,
      image: true,
      brand: { select: { id: true, name: true } },
    },
  });
  return created;
}

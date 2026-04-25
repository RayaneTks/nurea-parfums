import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";

/** Invalider après toute mutation catalogue (voir routes API marques / parfums). */
export const ADMIN_CATALOGUE_CACHE_TAG = "admin-catalogue";

/**
 * Données catalogue admin (marques + parfums) — même forme que GET /api/admin/catalogue.
 * Mis en cache serveur : utile quand la DB est distante (ex. Supabase) : une requête lourde
 * « réseau + Postgres » évite d’être rejouée à chaque hit SSR ou API tant que le tag est valide.
 */
export const getAdminCatalogueSnapshot = unstable_cache(
  async () => {
    const [brands, perfumes] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          catalogMode: true,
          status: true,
          image: true,
          imageLight: true,
          _count: { select: { perfumes: true } },
        },
      }),
      prisma.perfume.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          image: true,
          imageLight: true,
          isFeatured: true,
          status: true,
          brand: {
            select: {
              id: true,
              name: true,
              image: true,
              imageLight: true,
              catalogMode: true,
              status: true,
            },
          },
        },
      }),
    ]);
    return { brands, perfumes };
  },
  ["admin-catalogue-snapshot-v1"],
  { tags: [ADMIN_CATALOGUE_CACHE_TAG] },
);

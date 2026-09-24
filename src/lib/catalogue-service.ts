import { unstable_cache } from "next/cache";
import type { Category, Perfume } from "@/lib/data";
import { mockPerfumes } from "@/lib/data";
import { getBlurPlaceholder } from "@/lib/blurPlaceholder";
import { prisma } from "@/lib/db/prisma";
import {
  prismaCatalogInCooldown,
  registerPrismaCatalogFailure,
  registerPrismaCatalogSuccess,
} from "@/lib/db/prismaRuntimeCircuit";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { loadSeoCatalogue, type SeoBrand, type SeoPerfume } from "@/lib/catalog/seoCatalogue";

/** Cache données catalogue affichées sur le site public. */
export const PUBLIC_CATALOGUE_CACHE_TAG = "public-catalogue";

/** Cache de l’instantané catalogue de la gestion (recréé au jalon J11, même invalidation que le public). */
export const ADMIN_CATALOGUE_CACHE_TAG = "admin-catalogue";

export type CachedPublicCatalogue = {
  perfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
};

function perfumesFromMock(): Perfume[] {
  return mockPerfumes.map((p) => ({
    ...p,
    brandSlug: p.brandSlug ?? p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
  }));
}

function browseFromMock(): CatalogBrowseBrand[] {
  const byBrand = new Map<
    string,
    { slug: string; complete: boolean; curatedCount: number }
  >();
  for (const p of mockPerfumes) {
    const key = p.brand;
    const row = byBrand.get(key) ?? {
      slug: p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
      complete: false,
      curatedCount: 0,
    };
    if (p.category === "Gammes Complètes") {
      row.complete = true;
    } else {
      row.curatedCount += 1;
    }
    byBrand.set(key, row);
  }

  return [...byBrand.entries()]
    .map(([name, row]) => ({
      id: row.slug,
      name,
      slug: row.slug,
      assortment: row.complete ? ("COMPLETE" as const) : ("CURATED" as const),
      publishedCount: row.complete ? 0 : row.curatedCount,
      categories: [
        (row.complete ? "Gammes Complètes" : "Sélections Individuelles") as Category,
      ],
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Un visuel servable sur la vitrine : ni vide, ni gabarit, ni ancien chemin local. */
function isPublicImage(image: string | null | undefined): boolean {
  const img = image?.trim() ?? "";
  return img !== "" && !img.includes("placeholder.svg") && !img.startsWith("/parfums/");
}

async function loadPublicCatalogFromDb(): Promise<CachedPublicCatalogue> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }

  if (prismaCatalogInCooldown()) {
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }

  try {
    const [perfumes, rangeBrands, browseRows] = await Promise.all([
      prisma.perfume.findMany({
        where: {
          status: "PUBLISHED",
          brand: { status: "PUBLISHED" },
          name: { not: "" },
          image: { not: "" },
        },
        select: {
          id: true,
          name: true,
          image: true,
          imageLight: true,
          isFeatured: true,
          brand: {
            select: {
              name: true,
              slug: true,
              catalogMode: true,
            },
          },
        },
        orderBy: { id: "asc" },
      }),
      prisma.brand.findMany({
        where: {
          catalogMode: "COMPLETE",
          status: "PUBLISHED",
          name: { not: "" },
          AND: [{ image: { not: null } }, { image: { not: "" } }],
        },
        select: { id: true, name: true, slug: true, image: true, imageLight: true },
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { catalogMode: "COMPLETE" },
            { perfumes: { some: { status: "PUBLISHED" } } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          catalogMode: true,
          perfumes: {
            where: { status: "PUBLISHED" },
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const maxId = perfumes.reduce((acc, p) => Math.max(acc, p.id), 0);

    const asPerfumesFromBrands: Perfume[] = rangeBrands
      .filter((b) => isPublicImage(b.image) && b.name.trim() !== "")
      .map((b, idx) => ({
        id: maxId + idx + 1,
        name: b.name,
        brand: b.name,
        brandSlug: b.slug,
        category: "Gammes Complètes" as const,
        image: b.image!,
        imageLight: b.imageLight ?? undefined,
        blurDataURL: getBlurPlaceholder(b.image),
        tags: ["Gamme complète"],
      }));

    const mappedPerfumes: Perfume[] = perfumes
      .filter((p) => isPublicImage(p.image) && p.brand.name.trim() !== "" && p.name.trim() !== "")
      .map((p) => {
        const isComplete = p.brand.catalogMode === "COMPLETE";
        return {
          id: p.id,
          name: p.name,
          brand: p.brand.name,
          brandSlug: p.brand.slug,
          category: (isComplete
            ? "Gammes Complètes"
            : "Sélections Individuelles") as Category,
          image: p.image,
          imageLight: p.imageLight ?? undefined,
          blurDataURL: getBlurPlaceholder(p.image),
          isFeatured: p.isFeatured,
          tags: isComplete ? ["Gamme complète"] : undefined,
        };
      });

    const browseBrands: CatalogBrowseBrand[] = browseRows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      assortment: b.catalogMode,
      publishedCount: b.perfumes.length,
      categories:
        b.catalogMode === "COMPLETE"
          ? ["Gammes Complètes"]
          : ["Sélections Individuelles"],
    }));

    registerPrismaCatalogSuccess();
    return {
      perfumes: [...mappedPerfumes, ...asPerfumesFromBrands],
      browseBrands,
    };
  } catch (e) {
    registerPrismaCatalogFailure();
    console.error("[catalogue-service] public catalogue DB error:", e);
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }
}

const getPublicCatalogueCached = unstable_cache(
  loadPublicCatalogFromDb,
  // v2 : les slugs de marque ont ete corriges en base (louis-vuiton ->
  // louis-vuitton et neuf autres consonnes doublees perdues par un ancien
  // generateur). Le slug est la valeur du filtre public ?maison=, donc
  // l'instantane en cache devait etre jete ; changer la cle le garantit au
  // deploiement, sans dependre d'une mutation admin pour purger le tag.
  // v3 : noms et marques corriges en base hors de la gestion (audit du
  // 23/09/2026 : Hacivat -> Hundred Silent Ways, Elisabeth Arden -> Elizabeth
  // Arden, Eau Passion rendue a Franck Olivier, et une douzaine de fautes de
  // casse). Meme raison : aucune mutation admin n'a purge le tag.
  ["public-catalogue-v3"],
  { tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

/**
 * Un parfum au catalogue qui n'a pas (encore) sa carte sur la vitrine : masqué, marque masquée, ou sans
 * visuel servable. La recherche publique le reconnaît pour inviter à écrire — sans dire qu'on l'a, ni qu'on
 * ne l'a pas. Seuls le nom et la marque sortent : ni image, ni prix, ni stock.
 */
export type UnlistedPerfume = { name: string; brand: string };

async function loadUnlistedPerfumesFromDb(): Promise<UnlistedPerfume[]> {
  if (!process.env.DATABASE_URL?.trim() || prismaCatalogInCooldown()) return [];
  try {
    const rows = await prisma.perfume.findMany({
      where: { name: { not: "" } },
      select: { name: true, status: true, image: true, brand: { select: { name: true, status: true } } },
      orderBy: { id: "asc" },
    });
    return rows
      .filter((p) => p.name.trim() !== "" && p.brand.name.trim() !== "")
      .filter((p) => !(p.status === "PUBLISHED" && p.brand.status === "PUBLISHED" && isPublicImage(p.image)))
      .map((p) => ({ name: p.name.trim(), brand: p.brand.name.trim() }));
  } catch (e) {
    console.error("[catalogue-service] unlisted perfumes DB error:", e);
    return [];
  }
}

const getUnlistedPerfumesCached = unstable_cache(loadUnlistedPerfumesFromDb, ["unlisted-perfumes-v1"], {
  tags: [PUBLIC_CATALOGUE_CACHE_TAG],
});

/** Parfums hors vitrine, pour la recherche publique ; invalidés avec le catalogue public. */
export async function getUnlistedPerfumes(): Promise<UnlistedPerfume[]> {
  return getUnlistedPerfumesCached();
}

/**
 * Catalogue public (parfums + panneau Explorer) — une couche Prisma par invalidation du tag
 * `public-catalogue` (ex. après mutation admin).
 */
export async function getCachedCatalogue(): Promise<CachedPublicCatalogue> {
  return getPublicCatalogueCached();
}

const getSeoCatalogueCached = unstable_cache(loadSeoCatalogue, ["seo-catalogue-v1"], {
  tags: [PUBLIC_CATALOGUE_CACHE_TAG],
});

/**
 * Catalogue des pages indexables (`/parfums/*`, sitemap) — voir `src/lib/catalog/seoCatalogue.ts`.
 *
 * À la différence de `getCachedCatalogue`, AUCUN repli de démonstration : une base injoignable
 * lève, la page répond 500 et Google réessaie. Un repli vide aurait répondu 404 sur chaque fiche,
 * c'est-à-dire demandé leur retrait de l'index. Sans base configurée (poste local nu) : vide.
 */
export async function getSeoCatalogue(): Promise<SeoBrand[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  return getSeoCatalogueCached();
}

export async function getSeoBrand(slug: string): Promise<SeoBrand | null> {
  return (await getSeoCatalogue()).find((brand) => brand.slug === slug) ?? null;
}

export async function getSeoPerfume(id: number): Promise<{ brand: SeoBrand; perfume: SeoPerfume } | null> {
  for (const brand of await getSeoCatalogue()) {
    const perfume = brand.perfumes.find((p) => p.id === id);
    if (perfume) return { brand, perfume };
  }
  return null;
}

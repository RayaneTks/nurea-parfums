import { unstable_cache } from "next/cache";
import type { Perfume } from "@/lib/data";
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
import demoCatalogue from "@/lib/catalog/demo-catalogue.json";

/**
 * Combien de parfums portent « Nouveau » : les derniers entrés au catalogue, par date d'ajout.
 * Assez pour que la catégorie « Nouveautés » vive, pas au point de tout y mettre.
 */
export const NEW_ARRIVALS_COUNT = 10;

/** Cache données catalogue affichées sur le site public. */
export const PUBLIC_CATALOGUE_CACHE_TAG = "public-catalogue";

/** Cache de l’instantané catalogue de la gestion (recréé au jalon J11, même invalidation que le public). */
export const ADMIN_CATALOGUE_CACHE_TAG = "admin-catalogue";

export type CachedPublicCatalogue = {
  perfumes: Perfume[];
  browseBrands: CatalogBrowseBrand[];
};

/**
 * Sans base du tout — aperçu Vercel, poste de développement sans `.env` — la vitrine montre un
 * instantané du catalogue public (`demo-catalogue.json`, relevé sur nureaparfums.fr le 02/10/2026) :
 * on y juge un rendu, il faut donc des flacons à regarder. Rien que du public : nom, marque,
 * visuel. Une base configurée mais injoignable, elle, garde le repli vide — jamais un instantané
 * périmé présenté comme le catalogue du jour.
 */
const DEMO_PERFUMES = demoCatalogue as Perfume[];

function perfumesFromMock(source: Perfume[] = mockPerfumes): Perfume[] {
  return source.map((p) => ({
    ...p,
    category: "Tout voir",
    brandSlug: p.brandSlug ?? p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
  }));
}

function browseFromMock(source: Perfume[] = mockPerfumes): CatalogBrowseBrand[] {
  const byBrand = new Map<string, { slug: string; count: number }>();
  for (const p of source) {
    const key = p.brand;
    const row = byBrand.get(key) ?? {
      slug: p.brandSlug ?? p.brand.toLowerCase().trim().replace(/\s+/g, "-"),
      count: 0,
    };
    row.count += 1;
    byBrand.set(key, row);
  }

  return [...byBrand.entries()]
    .map(([name, row]) => ({
      id: row.slug,
      name,
      slug: row.slug,
      publishedCount: row.count,
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
    return { perfumes: perfumesFromMock(DEMO_PERFUMES), browseBrands: browseFromMock(DEMO_PERFUMES) };
  }

  if (prismaCatalogInCooldown()) {
    return { perfumes: perfumesFromMock(), browseBrands: browseFromMock() };
  }

  try {
    const [perfumes, browseRows] = await Promise.all([
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
          line: true,
          image: true,
          imageLight: true,
          ambientHue: true,
          ambientChroma: true,
          isFeatured: true,
          createdAt: true,
          brand: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { id: "asc" },
      }),
      prisma.brand.findMany({
        where: {
          status: "PUBLISHED",
          perfumes: { some: { status: "PUBLISHED" } },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          perfumes: {
            where: { status: "PUBLISHED" },
            select: { id: true },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    const mappedPerfumes: Perfume[] = perfumes
      .filter((p) => isPublicImage(p.image) && p.brand.name.trim() !== "" && p.name.trim() !== "")
      .map((p) => {
        return {
          id: p.id,
          name: p.name,
          brand: p.brand.name,
          brandSlug: p.brand.slug,
          line: p.line?.trim() || undefined,
          category: "Tout voir",
          image: p.image,
          imageLight: p.imageLight ?? undefined,
          ambientHue: p.ambientHue ?? undefined,
          ambientChroma: p.ambientChroma?.toNumber(),
          blurDataURL: getBlurPlaceholder(p.image),
          isFeatured: p.isFeatured,
        };
      });

    /*
     * « Nouveautés » : les NEW_ARRIVALS_COUNT derniers parfums entrés au catalogue (date d'ajout,
     * puis identifiant — une séquence — pour départager). Marqués ici, une fois, pour la grille ET la recherche.
     */
    const newest = new Set(
      [...perfumes]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
        .slice(0, NEW_ARRIVALS_COUNT)
        .map((p) => p.id),
    );
    for (const perfume of mappedPerfumes) {
      if (!newest.has(perfume.id)) continue;
      perfume.isNew = true;
      perfume.tags = [...(perfume.tags ?? []), "Nouveau"];
    }

    const browseBrands: CatalogBrowseBrand[] = browseRows.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      publishedCount: b.perfumes.length,
    }));

    registerPrismaCatalogSuccess();
    return {
      perfumes: mappedPerfumes,
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
  // v4 : visuels remplacés et noms corrigés en base hors de la gestion (audit des visuels des
  // 24-26/09/2026 : 45 fiches aux visuels refaits, 13 noms remis à l'orthographe de la marque,
  // Hibiscus Mahajád ajouté, Tiramisú retiré). Même raison que v2 et v3.
  // v5 : deuxième fournée de visuels refaits (28/09/2026, 15 fiches), écrite en base.
  // v6 : l'instantané porte désormais `isNew` (catégorie « Nouveautés ») — un instantané v5 servi
  // au nouveau code laisserait la catégorie vide jusqu'à la prochaine modification du catalogue.
  // v15 : les pages publiques montrent uniquement les fiches parfum ; le visuel de marque reste en bas de page.
  // v27 : l'instantané porte la couleur d'ambiance (ambientHue, ambientChroma, refonte vitrine T7).
  ["public-catalogue-v28"],
  { tags: [PUBLIC_CATALOGUE_CACHE_TAG] },
);

/**
 * Un parfum au catalogue qui n'a pas (encore) sa carte sur la vitrine : masqué, marque masquée, ou sans
 * visuel servable. La recherche publique le reconnaît pour inviter à écrire — sans dire qu'on l'a, ni qu'on
 * ne l'a pas. Seuls le nom, la marque et la gamme sortent : ni image, ni prix, ni stock.
 */
export type UnlistedPerfume = { name: string; brand: string; line?: string };

async function loadUnlistedPerfumesFromDb(): Promise<UnlistedPerfume[]> {
  if (!process.env.DATABASE_URL?.trim() || prismaCatalogInCooldown()) return [];
  try {
    const rows = await prisma.perfume.findMany({
      where: { name: { not: "" } },
      select: { name: true, line: true, status: true, image: true, brand: { select: { name: true, status: true } } },
      orderBy: { id: "asc" },
    });
    return rows
      .filter((p) => p.name.trim() !== "" && p.brand.name.trim() !== "")
      .filter((p) => !(p.status === "PUBLISHED" && p.brand.status === "PUBLISHED" && isPublicImage(p.image)))
      .map((p) => ({ name: p.name.trim(), brand: p.brand.name.trim(), ...(p.line?.trim() ? { line: p.line.trim() } : {}) }));
  } catch (e) {
    console.error("[catalogue-service] unlisted perfumes DB error:", e);
    return [];
  }
}

// v3 : fiches de la liste du fournisseur (12/10/2026) ajoutées en base hors de la gestion, masquées et sans
// visuel — la recherche doit les reconnaître sans attendre une mutation de la gestion qui purge le tag.
// v4 : second lot de la liste du fournisseur (identifications du 12/10/2026), même raison.
// v5 : quelques notes d'amour ajoutées en base avec son flacon d'origine, même raison.
const getUnlistedPerfumesCached = unstable_cache(loadUnlistedPerfumesFromDb, ["unlisted-perfumes-v17"], {
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

// v3 : mêmes corrections que « public-catalogue-v5 », écrites en base sans purge du tag.
// v10 : chaque parfum porte sa gamme (`line`).
const getSeoCatalogueCached = unstable_cache(loadSeoCatalogue, ["seo-catalogue-v23"], {
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

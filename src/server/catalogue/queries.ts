import "server-only";
import { createHash } from "node:crypto";
import type {
  AdminBrandRow,
  AdminCatalogue,
  AdminPerfumeRow,
  BrandSheet,
  PerfumeDuplicationDraft,
  PerfumeMediaItem,
  PerfumeSheet,
  PickerCatalogue,
  PickerPerfume,
  StockAlerts,
} from "@/contracts/catalogue";
import { FEATURED_LIMIT, hasVisual } from "@/domain/publication";
import { LOW_STOCK_THRESHOLD, stockStatus } from "@/domain/stock";
import { cleNom } from "@/lib/nommage";
import { cached } from "@/server/cache/cached";
import { PRICING_SELECT, brandState, pricingRows } from "@/server/catalogue/dto";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Lectures du catalogue de la gestion (04 §2.1, §12, §15). L'instantané admin, les alertes de stock et le
 * sélecteur sont cachés sous le tag `admin-catalogue` (invalidé par toute écriture de `Brand`, `Perfume`,
 * `PerfumePricing` ou `PerfumeMedia`) ; les fiches ne le sont pas : elles portent l'activité des ventes
 * (tag `gestion`) et servent à agir (04 §10.4).
 *
 * Les visuels story se lisent en SQL paramétré tant que le client Prisma généré ne connaît pas le modèle
 * `PerfumeMedia` (voir `media.ts`).
 */

const searchKey = (...parts: string[]) => parts.map(cleNom).join(" ");

type MediaDbRow = {
  id: string;
  url: string;
  label: string | null;
  width: number;
  height: number;
  bytes: number;
  sortOrder: number;
  createdAt: Date;
};

function mediaItem(row: MediaDbRow): PerfumeMediaItem {
  return {
    id: row.id,
    url: row.url,
    label: row.label,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Instantané admin (E15) ─────────────────────────────────────────────────────

async function loadAdminCatalogue(): Promise<AdminCatalogue> {
  const [brands, perfumes, mediaCounts] = await Promise.all([
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, catalogMode: true, status: true, image: true, imageLight: true },
    }),
    db.perfume.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        brandId: true,
        name: true,
        image: true,
        imageLight: true,
        status: true,
        isFeatured: true,
        stock: true,
        updatedAt: true,
      },
    }),
    db.$queryRaw<{ perfumeId: number; count: number }[]>`
      SELECT "perfumeId", count(*)::int AS count FROM "PerfumeMedia" GROUP BY "perfumeId"`,
  ]);

  const media = new Map(mediaCounts.map((row) => [row.perfumeId, row.count]));
  const byBrand = new Map(brands.map((brand) => [brand.id, brand]));
  const perfumeRows: AdminPerfumeRow[] = [];
  const counts = new Map<string, { total: number; published: number; republishable: number }>();

  for (const perfume of perfumes) {
    const brand = byBrand.get(perfume.brandId);
    if (!brand) continue; // cascade : impossible hors lecture concurrente d'une suppression
    const count = counts.get(brand.id) ?? { total: 0, published: 0, republishable: 0 };
    count.total += 1;
    if (perfume.status === "PUBLISHED") count.published += 1;
    else if (hasVisual(perfume.image)) count.republishable += 1;
    counts.set(brand.id, count);
    perfumeRows.push({
      id: perfume.id,
      name: perfume.name,
      image: perfume.image,
      imageLight: perfume.imageLight,
      status: perfume.status,
      isFeatured: perfume.isFeatured,
      stock: perfume.stock,
      stockStatus: stockStatus(perfume.stock),
      mediaCount: media.get(perfume.id) ?? 0,
      brand: brandState(brand),
      searchKey: searchKey(perfume.name, brand.name),
      updatedAt: perfume.updatedAt.toISOString(),
    });
  }

  const brandRows: AdminBrandRow[] = brands.map((brand) => {
    const count = counts.get(brand.id) ?? { total: 0, published: 0, republishable: 0 };
    return {
      ...brandState(brand),
      slug: brand.slug,
      imageLight: brand.imageLight,
      perfumeCount: count.total,
      publishedCount: count.published,
      republishableCount: count.republishable,
      searchKey: searchKey(brand.name),
    };
  });

  return {
    brands: brandRows,
    perfumes: perfumeRows,
    featured: { count: perfumes.filter((perfume) => perfume.isFeatured).length, limit: FEATURED_LIMIT },
  };
}

/** E15 : marques, parfums (dont le nombre de visuels story), emplacements de mise en avant. */
export const adminCatalogue = defineQuery(cached("catalogue.admin", "catalogue", loadAdminCatalogue));

// ── Fiches (E16, E17, duplication) ─────────────────────────────────────────────

/** E16 : fiche parfum en consultation ; `null` si le parfum n'existe plus. */
export const perfumeSheet = defineQuery(async (id: number): Promise<PerfumeSheet | null> => {
  const perfume = await db.perfume.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      imageLight: true,
      status: true,
      isFeatured: true,
      stock: true,
      brand: { select: { id: true, name: true, slug: true, status: true, catalogMode: true, image: true } },
      pricings: { select: PRICING_SELECT },
    },
  });
  if (!perfume) return null;

  const [media, [activity], featuredCount] = await Promise.all([
    db.$queryRaw<MediaDbRow[]>`
      SELECT id, url, label, width, height, bytes, "sortOrder", "createdAt"
      FROM "PerfumeMedia" WHERE "perfumeId" = ${id}
      ORDER BY "sortOrder" ASC, "createdAt" ASC, id ASC`,
    db.$queryRaw<{ units: number; documents: number; lastSoldAt: Date | null }[]>`
      SELECT COALESCE(sum(l.quantity), 0)::int AS units,
             count(DISTINCT l."documentId")::int AS documents,
             max(d."orderedAt") AS "lastSoldAt"
      FROM "SaleLine" l JOIN "SaleDocument" d ON d.id = l."documentId"
      WHERE l."perfumeId" = ${id} AND d.status <> 'CANCELLED'`,
    db.perfume.count({ where: { isFeatured: true } }),
  ]);

  return {
    perfume: {
      id: perfume.id,
      name: perfume.name,
      image: perfume.image,
      imageLight: perfume.imageLight,
      status: perfume.status,
      isFeatured: perfume.isFeatured,
      stock: perfume.stock,
      stockStatus: stockStatus(perfume.stock),
      brand: { ...brandState(perfume.brand), slug: perfume.brand.slug },
    },
    pricing: pricingRows(perfume.pricings),
    activity: {
      units: activity?.units ?? 0,
      documents: activity?.documents ?? 0,
      lastSoldAt: activity?.lastSoldAt ? activity.lastSoldAt.toISOString() : null,
    },
    media: media.map(mediaItem),
    featured: { count: featuredCount, limit: FEATURED_LIMIT },
  };
});

/** « Dupliquer » (E16 → E19 `?dupliquer=<id>`) : marque et tarifs repris ; nom, visuels et stock non repris. */
export const perfumeDuplicationDraft = defineQuery(async (id: number): Promise<PerfumeDuplicationDraft | null> => {
  const perfume = await db.perfume.findUnique({
    where: { id },
    select: {
      brand: { select: { id: true, name: true, status: true, catalogMode: true, image: true } },
      pricings: { select: PRICING_SELECT },
    },
  });
  return perfume ? { brand: brandState(perfume.brand), pricing: pricingRows(perfume.pricings) } : null;
});

/** E17 : marque en modification (slug en lecture seule, comptes pour les dialogues de cascade). */
export const brandSheet = defineQuery(async (id: string): Promise<BrandSheet | null> => {
  const brand = await db.brand.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      catalogMode: true,
      image: true,
      imageLight: true,
      perfumes: { select: { status: true, image: true } },
    },
  });
  if (!brand) return null;
  return {
    brand: { ...brandState(brand), slug: brand.slug, imageLight: brand.imageLight },
    perfumeCount: brand.perfumes.length,
    publishedCount: brand.perfumes.filter((perfume) => perfume.status === "PUBLISHED").length,
    republishableCount: brand.perfumes.filter((perfume) => perfume.status === "DRAFT" && hasVisual(perfume.image)).length,
  };
});

// ── Alertes de stock (E01, chips de E15) ───────────────────────────────────────

async function loadStockAlerts(): Promise<StockAlerts> {
  const rows = await db.perfume.findMany({
    where: { stock: { not: null, lte: LOW_STOCK_THRESHOLD } },
    select: { id: true, stock: true },
    orderBy: { id: "asc" },
  });
  const out: number[] = [];
  const low: number[] = [];
  for (const row of rows) {
    const status = stockStatus(row.stock);
    if (status === "out") out.push(row.id);
    else if (status === "low") low.push(row.id);
  }
  return {
    threshold: LOW_STOCK_THRESHOLD,
    out: { count: out.length, perfumeIds: out },
    low: { count: low.length, perfumeIds: low },
  };
}

/** Rupture (stock 0) et stock bas (1 à 3) : deux ensembles distincts ; un parfum non suivi n'y est jamais. */
export const stockAlerts = defineQuery(cached("catalogue.stockAlerts", "catalogue", loadStockAlerts));

// ── Sélecteur de ligne (S05, E11 ; GET /api/admin/picker?v=) ───────────────────

async function loadPicker(): Promise<PickerCatalogue> {
  const rows = await db.perfume.findMany({
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      image: true,
      status: true,
      stock: true,
      brand: { select: { name: true } },
      pricings: { select: PRICING_SELECT },
    },
  });
  const perfumes: PickerPerfume[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    brandName: row.brand.name,
    image: row.image,
    status: row.status,
    stock: row.stock,
    stockStatus: stockStatus(row.stock),
    searchKey: searchKey(row.name, row.brand.name),
    pricing: pricingRows(row.pricings),
  }));
  // Empreinte du contenu : la version change si et seulement si ce que le sélecteur affiche change.
  const version = createHash("sha256").update(JSON.stringify(perfumes)).digest("hex").slice(0, 16);
  return { version, perfumes };
}

const cachedPicker = cached("catalogue.picker", "catalogue", loadPicker);

/** Parfums de tous statuts et leur grille par volume, pour le sélecteur de ligne. */
export const pickerCatalogue = defineQuery(() => cachedPicker());

/** Version courante du sélecteur, passée par le RSC dans l'URL de `GET /api/admin/picker?v=`. */
export const pickerVersion = defineQuery(async () => (await cachedPicker()).version);

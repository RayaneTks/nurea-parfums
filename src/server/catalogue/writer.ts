import "server-only";
import { Prisma } from "@prisma/client";
import {
  PERFUME_NAME_MESSAGE,
  type BrandDeletion,
  type BrandRefData,
  type BrandRepublication,
  type BrandSummary,
  type BrandWrite,
  type CreateBrandData,
  type CreatePerfumeData,
  type PerfumeDeletion,
  type PerfumeSummary,
  type PricingGridData,
  type PricingRow,
  type SetPerfumeFeaturedData,
  type SetPerfumeStatusData,
  type UpdateBrandData,
  type UpdatePerfumeData,
} from "@/contracts/catalogue";
import { DomainError, NeedsConfirmation } from "@/domain/errors";
import { toDb, type Dzd, type Eur, type Rate } from "@/domain/money";
import {
  brandHidesPerfumes,
  canFeaturePerfume,
  canPublishBrand,
  canPublishPerfume,
  hasVisual,
  settlePerfumePublication,
  type BrandCatalogMode,
  type PublicationStatus,
} from "@/domain/publication";
import type { VolumeMl } from "@/domain/sale-line";
import { cleNom, normaliseMarque, normaliseParfum } from "@/lib/nommage";
import { PRICING_SELECT, perfumeSummary, pricingRow, pricingRows } from "@/server/catalogue/dto";
import * as catalogueMedia from "@/server/catalogue/media";
import { marqueEquivalente, resoudMarqueParNom, slugMarqueLibre, type MarqueTrouvee } from "@/server/catalogue/resoudMarque";
import type { WithObjectRemoval } from "@/server/catalogue/storage";
import type { Tx } from "@/server/db/transaction";

/**
 * Writer du catalogue (04 §4.3) : `Brand`, `Perfume` hors stock, `PerfumePricing`. Il décide et valide
 * (règles uniques de `src/domain/publication.ts`, doublées par les CHECK de 03 §4.9) puis écrit.
 *
 * - Le stock n'est jamais écrit ici : `src/server/catalogue/stock.ts` (04 §11).
 * - Les visuels story (`PerfumeMedia`) : `src/server/catalogue/media.ts`.
 * - Une suppression rend les URL d'objets devenus inutiles ; l'action les supprime du bucket APRÈS le
 *   commit (`storage.commitThenRemoveObjects`), jamais une URL encore référencée (autre fiche, snapshot
 *   d'une ligne de document).
 *
 * Verrous. Au-dessus des lignes `Perfume` (rang 4 de 04 §4.2), le catalogue prend la ligne `Brand` : en
 * partage pour publier ou rattacher un parfum, exclusif pour modifier, masquer (T14) ou supprimer la marque.
 * Un parfum ne peut donc pas être publié pendant que sa marque se masque (il ne serait jamais plus visible
 * que sa marque). La mise en avant se sérialise par un verrou consultatif : deux mises en avant simultanées
 * ne dépassent jamais les deux emplacements.
 */

export const BRAND_NOT_FOUND = "Cette marque n'existe plus. Elle a peut-être été supprimée depuis un autre écran.";
export const PERFUME_NOT_FOUND = catalogueMedia.PERFUME_NOT_FOUND_MESSAGE;
export const STALE_PERFUME = "Ce parfum vient d'être modifié depuis un autre écran : recharge sa fiche et réessaie.";

const PERFUME_SELECT = { id: true, brandId: true, name: true, status: true, isFeatured: true } as const;

const BRAND_SELECT = {
  id: true,
  name: true,
  slug: true,
  catalogMode: true,
  status: true,
  image: true,
  imageLight: true,
} as const;

type LockedBrand = MarqueTrouvee;

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

function brandSummary(row: LockedBrand): BrandSummary {
  return { id: row.id, name: row.name, slug: row.slug, catalogMode: row.catalogMode, status: row.status };
}

/** Verrouille des marques (ids triés) et rend leur état relu sous verrou. Une marque disparue est absente. */
async function lockBrands(tx: Tx, ids: readonly string[], mode: "update" | "share"): Promise<Map<string, LockedBrand>> {
  const sorted = [...new Set(ids)].sort();
  if (sorted.length === 0) return new Map();
  const clause = Prisma.raw(mode === "update" ? "FOR UPDATE" : "FOR SHARE");
  const rows = await tx.db.$queryRaw<LockedBrand[]>(Prisma.sql`
    SELECT id, name, slug, "catalogMode"::text AS "catalogMode", status::text AS status, image, "imageLight"
    FROM "Brand" WHERE id = ANY(${sorted}::text[]) ORDER BY id ${clause}`);
  return new Map(rows.map((row) => [row.id, row]));
}

async function lockBrand(tx: Tx, id: string, mode: "update" | "share"): Promise<LockedBrand | null> {
  return (await lockBrands(tx, [id], mode)).get(id) ?? null;
}

// ── Tarifs ─────────────────────────────────────────────────────────────────────

export type PricingMemory = {
  perfumeId: number;
  volumeMl: VolumeMl;
  unitPriceEur: Eur;
  /** null : coût inconnu sur cette ligne — la mémoire garde le dernier coût connu. */
  unitCostDzd: Dzd | null;
  /** null : taux absent sur cette ligne — la mémoire garde le dernier taux connu. */
  exchangeRate: Rate | null;
};

/**
 * Mémoire de prix apprenante (02 §5 N8, 03 `PerfumePricing`) : le dernier prix pratiqué pour
 * (parfum, volume) remplace le précédent — fin du `update: {}` de l'existant qui figeait la première
 * saisie (01 §4.1). Un coût ou un taux absent de la ligne n'efface pas celui qui est mémorisé : une
 * ligne « coût à compléter » ne doit pas vider le pré-remplissage de la suivante.
 * Appelé par le writer `documents` pour chaque ligne NON offerte d'un parfum du catalogue, créée ou dont
 * le tarif a changé.
 */
export async function upsertPricing(tx: Tx, memory: PricingMemory): Promise<void> {
  const price = toDb(memory.unitPriceEur);
  const cost = memory.unitCostDzd === null ? null : toDb(memory.unitCostDzd);
  const rate = memory.exchangeRate === null ? null : toDb(memory.exchangeRate);
  await tx.db.perfumePricing.upsert({
    where: { perfumeId_volumeMl: { perfumeId: memory.perfumeId, volumeMl: memory.volumeMl } },
    create: {
      perfumeId: memory.perfumeId,
      volumeMl: memory.volumeMl,
      defaultUnitPriceEur: price,
      defaultUnitCostDzd: cost,
      defaultExchangeRate: rate,
    },
    update: {
      defaultUnitPriceEur: price,
      ...(cost === null ? {} : { defaultUnitCostDzd: cost }),
      ...(rate === null ? {} : { defaultExchangeRate: rate }),
    },
    select: { perfumeId: true },
  });
}

/**
 * La grille saisie sur la fiche (E19 zone 3) devient la grille du parfum, à l'identique : volume absent =
 * retiré ; coût ou taux vidé = effacé (contrairement à l'apprentissage, c'est une saisie explicite).
 * N'écrit que les volumes qui changent : un enregistrement sans modification ne touche pas la base.
 */
export async function savePricingGrid(tx: Tx, perfumeId: number, grid: PricingGridData): Promise<PricingRow[]> {
  const existing = await tx.db.perfumePricing.findMany({ where: { perfumeId }, select: PRICING_SELECT });
  const kept = new Set<number>(grid.map((entry) => entry.volumeMl));
  const obsolete = existing.filter((row) => !kept.has(row.volumeMl)).map((row) => row.volumeMl);
  if (obsolete.length > 0) {
    await tx.db.perfumePricing.deleteMany({ where: { perfumeId, volumeMl: { in: obsolete } } });
  }

  const stored = new Map(existing.map((row) => [row.volumeMl, pricingRow(row)]));
  const target = pricingRows(
    grid.map((entry) => ({
      volumeMl: entry.volumeMl,
      defaultUnitPriceEur: entry.unitPriceEur,
      defaultUnitCostDzd: entry.unitCostDzd,
      defaultExchangeRate: entry.exchangeRate,
    })),
  );
  for (const entry of grid) {
    // Comparaison sur les formes normalisées par `money.ts` : « 277 » saisi = « 277.0000 » en base.
    const wanted = target.find((row) => row.volumeMl === entry.volumeMl);
    const current = stored.get(entry.volumeMl);
    if (
      current &&
      wanted &&
      current.unitPriceEur === wanted.unitPriceEur &&
      current.unitCostDzd === wanted.unitCostDzd &&
      current.exchangeRate === wanted.exchangeRate
    ) {
      continue;
    }
    await tx.db.perfumePricing.upsert({
      where: { perfumeId_volumeMl: { perfumeId, volumeMl: entry.volumeMl } },
      create: {
        perfumeId,
        volumeMl: entry.volumeMl,
        defaultUnitPriceEur: entry.unitPriceEur,
        defaultUnitCostDzd: entry.unitCostDzd,
        defaultExchangeRate: entry.exchangeRate,
      },
      update: {
        defaultUnitPriceEur: entry.unitPriceEur,
        defaultUnitCostDzd: entry.unitCostDzd,
        defaultExchangeRate: entry.exchangeRate,
      },
      select: { perfumeId: true },
    });
  }
  return target;
}

// ── Marques ────────────────────────────────────────────────────────────────────

export type BrandCreation = {
  brand: LockedBrand;
  /** Faux : une marque équivalente existait déjà, elle est rendue telle quelle (dédoublonnage, 02 §4.5). */
  created: boolean;
};

/**
 * Crée une marque, ou rend l'équivalente déjà au catalogue (`resoudMarque`). Le slug est calculé ICI, une
 * fois (suffixe d'unicité), et plus jamais ensuite (04 §12).
 */
export async function createBrand(
  tx: Tx,
  input: Pick<CreateBrandData, "name" | "catalogMode" | "status" | "image" | "imageLight">,
): Promise<BrandCreation> {
  const resolution = await resoudMarqueParNom(tx.db, input.name);
  if (!resolution) throw new DomainError("VALIDATION", "Indique le nom de la marque (2 caractères au moins).", "name");
  if ("existante" in resolution) return { brand: resolution.existante, created: false };

  const name = resolution.aCreer;
  const image = input.image ?? null;
  if (input.status === "PUBLISHED") {
    const verdict = canPublishBrand({ catalogMode: input.catalogMode, image });
    if (!verdict.ok) throw new DomainError("CONFLICT", verdict.message);
  }
  const brand = await tx.db.brand.create({
    data: {
      name,
      slug: await slugMarqueLibre(tx.db, name),
      catalogMode: input.catalogMode,
      status: input.status,
      image,
      imageLight: input.imageLight ?? null,
    },
    select: BRAND_SELECT,
  });
  return { brand, created: true };
}

async function republishableCount(tx: Tx, brandId: string): Promise<number> {
  const drafts = await tx.db.perfume.findMany({ where: { brandId, status: "DRAFT" }, select: { image: true } });
  return drafts.filter((perfume) => hasVisual(perfume.image)).length;
}

/**
 * Cascade T14 (03 §4.3) : une marque masquée ou en gamme complète masque ses parfums, et un parfum masqué
 * perd sa mise en avant. Des parfums visibles à masquer ⇒ réserve « Ses 14 parfums seront masqués sur la
 * vitrine. » tant qu'elle n'est pas confirmée (06 S18), levée AVANT toute écriture.
 */
async function hideBrandPerfumes(
  tx: Tx,
  current: LockedBrand,
  next: { name: string; status: PublicationStatus; catalogMode: BrandCatalogMode },
  confirm: boolean,
): Promise<number> {
  if (!brandHidesPerfumes(next)) return 0;
  const affected = await tx.db.perfume.findMany({
    where: { brandId: current.id, OR: [{ status: "PUBLISHED" }, { isFeatured: true }] },
    select: { id: true, status: true },
  });
  const visible = affected.filter((perfume) => perfume.status === "PUBLISHED").length;
  if (visible > 0 && !confirm) {
    const title =
      next.status === "DRAFT" && current.status !== "DRAFT"
        ? `Masquer ${next.name} ?`
        : next.catalogMode === "COMPLETE" && current.catalogMode !== "COMPLETE"
          ? `Passer ${next.name} en gamme complète ?`
          : `Masquer les parfums de ${next.name} ?`;
    const reserve =
      visible === 1 ? "Son parfum visible sera masqué sur la vitrine." : `Ses ${visible} parfums seront masqués sur la vitrine.`;
    throw new NeedsConfirmation(title, [reserve], "Confirmer");
  }
  if (affected.length > 0) {
    await tx.db.perfume.updateMany({
      where: { id: { in: affected.map((perfume) => perfume.id) } },
      data: { status: "DRAFT", isFeatured: false },
    });
  }
  return visible;
}

/**
 * Modifier une marque (E17), ou seulement sa visibilité (E15, `setBrandVisibilityAction`). Le slug n'est
 * JAMAIS recalculé : renommer « Dior » en « Christian Dior » garde `?maison=dior` (02 §4.9).
 */
export async function updateBrand(tx: Tx, input: UpdateBrandData): Promise<BrandWrite> {
  const current = await lockBrand(tx, input.id, "update");
  if (!current) throw new DomainError("NOT_FOUND", BRAND_NOT_FOUND);

  const data: {
    name?: string;
    catalogMode?: BrandCatalogMode;
    status?: PublicationStatus;
    image?: string | null;
    imageLight?: string | null;
  } = {};
  if (input.name !== undefined) {
    const name = normaliseMarque(input.name);
    if (name.length < 2 || cleNom(name) === "") {
      throw new DomainError("VALIDATION", "Indique le nom de la marque (2 caractères au moins).", "name");
    }
    if (name !== current.name) {
      const twin = await marqueEquivalente(tx.db, name, current.id);
      if (twin) {
        throw new DomainError("CONFLICT", `La marque ${twin.name} porte déjà ce nom : ouvre-la plutôt que d'en renommer une autre.`);
      }
      data.name = name;
    }
  }
  if (input.catalogMode !== undefined && input.catalogMode !== current.catalogMode) data.catalogMode = input.catalogMode;
  if (input.status !== undefined && input.status !== current.status) data.status = input.status;
  if (input.image !== undefined && input.image !== current.image) data.image = input.image;
  if (input.imageLight !== undefined && input.imageLight !== current.imageLight) data.imageLight = input.imageLight;

  const next = {
    name: data.name ?? current.name,
    catalogMode: data.catalogMode ?? current.catalogMode,
    status: data.status ?? current.status,
    image: data.image !== undefined ? data.image : current.image,
  };
  if (next.status === "PUBLISHED") {
    const verdict = canPublishBrand(next);
    if (!verdict.ok) throw new DomainError("CONFLICT", verdict.message);
  }

  const hiddenPerfumes = await hideBrandPerfumes(tx, current, next, input.confirm);
  if (Object.keys(data).length > 0) {
    await tx.db.brand.update({ where: { id: current.id }, data, select: { id: true } });
  }
  const republishable =
    next.status === "PUBLISHED" && next.catalogMode === "CURATED" ? await republishableCount(tx, current.id) : 0;
  return {
    brand: brandSummary({ ...current, ...next, imageLight: data.imageLight !== undefined ? data.imageLight : current.imageLight }),
    hiddenPerfumes,
    republishable,
  };
}

/** « Republier les N parfums qui ont un visuel » (06 F-4.5-06) : la marque doit pouvoir les montrer. */
export async function republishBrandPerfumes(tx: Tx, brandId: string): Promise<BrandRepublication> {
  const brand = await lockBrand(tx, brandId, "share");
  if (!brand) throw new DomainError("NOT_FOUND", BRAND_NOT_FOUND);
  const drafts = await tx.db.perfume.findMany({
    where: { brandId, status: "DRAFT" },
    select: { id: true, image: true },
    orderBy: { id: "asc" },
  });
  const eligible = drafts.filter((perfume) => hasVisual(perfume.image));
  if (eligible.length === 0) return { brandId, republished: 0 };
  const verdict = canPublishPerfume(eligible[0] as { image: string }, brand);
  if (!verdict.ok) throw new DomainError("CONFLICT", verdict.message);
  await tx.db.perfume.updateMany({
    where: { id: { in: eligible.map((perfume) => perfume.id) }, status: "DRAFT" },
    data: { status: "PUBLISHED" },
  });
  return { brandId, republished: eligible.length };
}

/**
 * Parmi ces URL, celles que plus rien ne référence une fois les DELETE faits (lu dans la transaction) :
 * une autre fiche (parfum dupliqué, logo partagé), le snapshot d'une ligne de document (l'historique garde
 * sa vignette, 02 §4.5) ou un autre visuel story.
 */
async function unreferencedObjectUrls(tx: Tx, urls: readonly (string | null | undefined)[]): Promise<string[]> {
  const candidates = [...new Set(urls.filter((url): url is string => typeof url === "string" && url.trim() !== ""))];
  if (candidates.length === 0) return [];
  const rows = await tx.db.$queryRaw<{ url: string }[]>`
    SELECT c.url FROM unnest(${candidates}::text[]) AS c(url)
    WHERE NOT EXISTS (SELECT 1 FROM "Perfume" p WHERE p.image = c.url OR p."imageLight" = c.url)
      AND NOT EXISTS (SELECT 1 FROM "Brand" b WHERE b.image = c.url OR b."imageLight" = c.url)
      AND NOT EXISTS (SELECT 1 FROM "SaleLine" l WHERE l."imageUrl" = c.url)
      AND NOT EXISTS (SELECT 1 FROM "PerfumeMedia" m WHERE m.url = c.url)`;
  return rows.map((row) => row.url);
}

/**
 * Supprimer une marque et, en cascade, ses parfums, leurs tarifs et leurs visuels story (suppression dure,
 * 02 §4.5). Les lignes de documents gardent leur snapshot (`SetNull`) : l'historique reste lisible.
 * Les URL des logos, visuels et planches sont lues AVANT le DELETE. Déjà absente : succès sans écriture.
 */
export async function deleteBrand(tx: Tx, brandId: string): Promise<WithObjectRemoval<BrandDeletion>> {
  const brand = await lockBrand(tx, brandId, "update");
  if (!brand) return { data: { id: brandId, deleted: false, perfumes: 0 }, remove: [] };
  const perfumes = await tx.db.perfume.findMany({ where: { brandId }, select: { id: true, image: true, imageLight: true } });
  const mediaUrls = await catalogueMedia.mediaUrlsOfPerfumes(tx, perfumes.map((perfume) => perfume.id));
  await tx.db.brand.delete({ where: { id: brandId }, select: { id: true } });
  const remove = await unreferencedObjectUrls(tx, [
    brand.image,
    brand.imageLight,
    ...perfumes.flatMap((perfume) => [perfume.image, perfume.imageLight]),
    ...mediaUrls,
  ]);
  return { data: { id: brandId, deleted: true, perfumes: perfumes.length }, remove };
}

// ── Parfums ────────────────────────────────────────────────────────────────────

export type PerfumeWrite = {
  perfume: PerfumeSummary;
  /** Informations à dire sans bloquer : marque rattachée à une graphie existante, parfum enregistré masqué. */
  notices: string[];
};

/** La marque d'une fiche, verrouillée en partage ; créée (ou rattachée à l'équivalente) si saisie. */
async function brandForPerfume(tx: Tx, ref: BrandRefData, notices: string[]): Promise<LockedBrand> {
  if (ref.kind === "existing") {
    const brand = await lockBrand(tx, ref.brandId, "share");
    if (!brand) throw new DomainError("NOT_FOUND", BRAND_NOT_FOUND);
    return brand;
  }
  const creation = await createBrand(tx, { name: ref.name, catalogMode: "CURATED", status: "PUBLISHED", image: null, imageLight: null });
  if (creation.created) return creation.brand;
  notices.push(`Rattaché à ${creation.brand.name}, déjà au catalogue.`);
  const brand = await lockBrand(tx, creation.brand.id, "share");
  if (!brand) throw new DomainError("NOT_FOUND", BRAND_NOT_FOUND);
  return brand;
}

/**
 * Nom normalisé (`normaliseParfum`), et refusé s'il fait doublon dans la marque sous une autre graphie
 * (« Dior a déjà un parfum nommé Sauvage. », 06 E19) — la base ne refuserait que l'égalité exacte.
 */
async function perfumeNameFor(tx: Tx, raw: string, brand: LockedBrand, selfId: number | null): Promise<string> {
  const name = normaliseParfum(raw);
  if (cleNom(name) === "") throw new DomainError("VALIDATION", PERFUME_NAME_MESSAGE, "name");
  const siblings = await tx.db.perfume.findMany({
    where: { brandId: brand.id, ...(selfId === null ? {} : { id: { not: selfId } }) },
    select: { name: true },
  });
  const key = cleNom(name);
  const twin = siblings.find((perfume) => cleNom(perfume.name) === key);
  if (twin) throw new DomainError("CONFLICT", `${brand.name} a déjà un parfum nommé ${twin.name}.`);
  return name;
}

/**
 * Créer un parfum avec sa grille (A-6), en une transaction. Il naît « Non suivi » (stock NULL) ; s'il ne
 * peut pas être visible (sans visuel, marque masquée ou en gamme complète), il est enregistré masqué et la
 * notice le dit (« Sauvage ajouté, masqué : rends d'abord la marque Dior visible. »).
 */
export async function createPerfume(tx: Tx, input: CreatePerfumeData): Promise<PerfumeWrite> {
  const notices: string[] = [];
  const brand = await brandForPerfume(tx, input.brand, notices);
  const name = await perfumeNameFor(tx, input.name, brand, null);
  const settled = settlePerfumePublication({ status: input.status, isFeatured: false }, { image: input.image }, brand);
  const perfume = await tx.db.perfume.create({
    data: {
      brandId: brand.id,
      name,
      image: input.image,
      imageLight: input.imageLight ?? null,
      status: settled.status,
      isFeatured: false,
    },
    select: PERFUME_SELECT,
  });
  if (input.pricing.length > 0) await savePricingGrid(tx, perfume.id, input.pricing);
  if (settled.hiddenBecause) notices.push(`${name} ajouté, masqué : ${lowerFirst(settled.hiddenBecause)}`);
  return { perfume: perfumeSummary(perfume), notices };
}

/**
 * Modifier fiche ET grille en un enregistrement (A-6, E19), ou seulement le visuel (enregistrement
 * automatique après envoi). Un champ absent n'est pas touché. La visibilité ne change que vers le bas :
 * un parfum qui ne peut plus être visible (visuel retiré, marque masquée) est masqué, et la notice le dit.
 */
export async function updatePerfume(tx: Tx, input: UpdatePerfumeData): Promise<PerfumeWrite> {
  const notices: string[] = [];
  const before = await tx.db.perfume.findUnique({ where: { id: input.id }, select: { brandId: true } });
  if (!before) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND);

  const created = input.brand?.kind === "new" ? await brandForPerfume(tx, input.brand, notices) : null;
  const locked = await lockBrands(
    tx,
    [before.brandId, ...(input.brand?.kind === "existing" ? [input.brand.brandId] : [])],
    "share",
  );
  const brand =
    created ??
    (input.brand?.kind === "existing" ? locked.get(input.brand.brandId) : locked.get(before.brandId)) ??
    null;
  if (!brand) throw new DomainError("NOT_FOUND", BRAND_NOT_FOUND);

  const { perfumes } = await tx.lock({ perfumes: [input.id] });
  const current =
    perfumes.length === 0
      ? null
      : await tx.db.perfume.findUnique({
          where: { id: input.id },
          select: { ...PERFUME_SELECT, image: true, imageLight: true },
        });
  if (!current) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND);
  if (current.brandId !== before.brandId) throw new DomainError("CONFLICT", STALE_PERFUME);

  const data: {
    brandId?: string;
    name?: string;
    image?: string;
    imageLight?: string | null;
    status?: PublicationStatus;
    isFeatured?: boolean;
  } = {};
  const brandChanged = brand.id !== current.brandId;
  if (brandChanged) data.brandId = brand.id;
  if (brandChanged || (input.name !== undefined && normaliseParfum(input.name) !== current.name)) {
    const name = await perfumeNameFor(tx, input.name ?? current.name, brand, current.id);
    if (name !== current.name) data.name = name;
  }
  if (input.image !== undefined && input.image !== current.image) data.image = input.image;
  if (input.imageLight !== undefined && input.imageLight !== current.imageLight) data.imageLight = input.imageLight;

  const settled = settlePerfumePublication(
    { status: current.status, isFeatured: current.isFeatured },
    { image: data.image ?? current.image },
    brand,
  );
  if (settled.status !== current.status) data.status = settled.status;
  if (settled.isFeatured !== current.isFeatured) data.isFeatured = settled.isFeatured;

  const perfume =
    Object.keys(data).length > 0
      ? await tx.db.perfume.update({ where: { id: current.id }, data, select: PERFUME_SELECT })
      : current;
  if (input.pricing !== undefined) await savePricingGrid(tx, current.id, input.pricing);
  if (current.status === "PUBLISHED" && settled.hiddenBecause) {
    notices.push(`${perfume.name} masqué : ${lowerFirst(settled.hiddenBecause)}`);
  }
  return { perfume: perfumeSummary(perfume), notices };
}

/**
 * Visibilité en 1 tap (E15, E16). Publier : refus `CONFLICT` avec le message unique du domaine
 * (« Ajoute un visuel pour publier ce parfum. »), rien d'écrit. Masquer : retire aussi la mise en avant.
 */
export async function setPerfumeStatus(tx: Tx, input: SetPerfumeStatusData): Promise<PerfumeSummary> {
  const before = await tx.db.perfume.findUnique({ where: { id: input.id }, select: { brandId: true } });
  if (!before) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND);
  const brand = input.status === "PUBLISHED" ? await lockBrand(tx, before.brandId, "share") : null;

  const { perfumes } = await tx.lock({ perfumes: [input.id] });
  const current =
    perfumes.length === 0
      ? null
      : await tx.db.perfume.findUnique({ where: { id: input.id }, select: { ...PERFUME_SELECT, image: true } });
  if (!current) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND);

  if (input.status === "DRAFT") {
    if (current.status === "DRAFT" && !current.isFeatured) return perfumeSummary(current);
    return perfumeSummary(
      await tx.db.perfume.update({
        where: { id: current.id },
        data: { status: "DRAFT", isFeatured: false },
        select: PERFUME_SELECT,
      }),
    );
  }

  if (current.status === "PUBLISHED") return perfumeSummary(current);
  if (current.brandId !== before.brandId) throw new DomainError("CONFLICT", STALE_PERFUME);
  if (!brand) throw new DomainError("NOT_FOUND", BRAND_NOT_FOUND);
  const verdict = canPublishPerfume(current, brand);
  if (!verdict.ok) throw new DomainError("CONFLICT", verdict.message);
  return perfumeSummary(
    await tx.db.perfume.update({ where: { id: current.id }, data: { status: "PUBLISHED" }, select: PERFUME_SELECT }),
  );
}

/**
 * Mettre en avant (2 au plus, parfum visible exigé) ou retirer. Le verrou consultatif sérialise les mises
 * en avant : le décompte relu sous ce verrou est exact.
 */
export async function setPerfumeFeatured(tx: Tx, input: SetPerfumeFeaturedData): Promise<PerfumeSummary> {
  if (input.featured) {
    await tx.db.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext('nurea:catalogue:featured')::bigint)`;
  }
  const { perfumes } = await tx.lock({ perfumes: [input.id] });
  const current =
    perfumes.length === 0 ? null : await tx.db.perfume.findUnique({ where: { id: input.id }, select: PERFUME_SELECT });
  if (!current) throw new DomainError("NOT_FOUND", PERFUME_NOT_FOUND);
  if (current.isFeatured === input.featured) return perfumeSummary(current);

  if (input.featured) {
    const others = await tx.db.perfume.count({ where: { isFeatured: true, id: { not: current.id } } });
    const verdict = canFeaturePerfume(current, others);
    if (!verdict.ok) throw new DomainError("CONFLICT", verdict.message);
  }
  return perfumeSummary(
    await tx.db.perfume.update({ where: { id: current.id }, data: { isFeatured: input.featured }, select: PERFUME_SELECT }),
  );
}

/**
 * Supprimer un parfum (suppression dure, 02 §4.5) : tarifs et visuels story en cascade, lignes de documents
 * en `SetNull` avec leur snapshot. Les URL du visuel et des planches sont lues AVANT le DELETE ; l'action
 * supprime les objets après le commit. Déjà absent : succès sans écriture.
 */
export async function deletePerfume(tx: Tx, id: number): Promise<WithObjectRemoval<PerfumeDeletion>> {
  const { perfumes } = await tx.lock({ perfumes: [id] });
  const perfume =
    perfumes.length === 0 ? null : await tx.db.perfume.findUnique({ where: { id }, select: { image: true, imageLight: true } });
  if (!perfume) return { data: { id, deleted: false }, remove: [] };
  const mediaUrls = await catalogueMedia.mediaUrlsOfPerfumes(tx, [id]);
  await tx.db.perfume.delete({ where: { id }, select: { id: true } });
  const remove = await unreferencedObjectUrls(tx, [perfume.image, perfume.imageLight, ...mediaUrls]);
  return { data: { id, deleted: true }, remove };
}

import type { PrismaClient } from "@prisma/client";
import { seedDocuments } from "./documents";

/**
 * Jeu minimal des tests de bout en bout (04 §16.4) : poches (dont « Non attribué »), réglages,
 * 5 marques, 20 parfums, 5 clients, 1 lot ouvert. Aucun document ni mouvement : chaque parcours crée
 * les siens par l'écran, et l'Accueil peut être éprouvé vide.
 *
 * Écrit en Prisma direct (autorisé hors `src/`), sur un client dont l'URL est fournie par
 * `global-setup.ts` — jamais celle de `.env`.
 */

/** Visuel local servi par `public/` : un parfum publié exige une image (CHECK `perfume_publish_image_ck`). */
const IMAGE = "/branding/monogram/np-circle-bordeaux.webp";

/**
 * Identifiant à la forme d'un cuid (`c` + 24 caractères), la seule qu'acceptent les contrats (`entityId`,
 * `src/domain/ids.ts`) : un identifiant de seed « e2e-marque-dior » était refusé par toute action qui le
 * reçoit (« Cet élément n'est plus reconnu »). Lisible dans la base : `ce2emarquedior00000000000`.
 */
export function seedEntityId(label: string): string {
  return `c${`e2e${label}`.replace(/[^a-z0-9]/g, "").padEnd(24, "0").slice(0, 24)}`;
}

export const SEED = {
  // Identifiants de poche, de client et de lot à la forme d'un cuid : les encaissements et rattachements (J8) les
  // reçoivent par leurs contrats (`recordId`, `entityId`).
  pockets: [
    { id: seedEntityId("pochenonattribue"), name: "Non attribué", kind: "UNASSIGNED", isSystem: true, sortOrder: 0 },
    { id: seedEntityId("pocheespeces"), name: "Espèces", kind: "CASH", isSystem: false, sortOrder: 1 },
    { id: seedEntityId("pochebanque"), name: "Banque", kind: "BANK", isSystem: false, sortOrder: 2 },
  ],
  brands: [
    // `key` : référence des parfums ci-dessous ; `id` : l'identifiant en base, à la forme d'un cuid.
    { key: "e2e-marque-dior", id: seedEntityId("marquedior"), name: "Dior", slug: "dior" },
    { key: "e2e-marque-chanel", id: seedEntityId("marquechanel"), name: "Chanel", slug: "chanel" },
    { key: "e2e-marque-ysl", id: seedEntityId("marqueysl"), name: "Yves Saint Laurent", slug: "yves-saint-laurent" },
    { key: "e2e-marque-guerlain", id: seedEntityId("marqueguerlain"), name: "Guerlain", slug: "guerlain" },
    { key: "e2e-marque-lattafa", id: seedEntityId("marquelattafa"), name: "Lattafa", slug: "lattafa" },
  ],
  /** [marque, nom, stock (null = non suivi), publié] — ruptures, stocks bas et masqués compris. */
  perfumes: [
    ["e2e-marque-dior", "Sauvage", 12, true],
    ["e2e-marque-dior", "Miss Dior", 3, true],
    ["e2e-marque-dior", "J'adore", null, true],
    ["e2e-marque-dior", "Fahrenheit", 0, true],
    ["e2e-marque-chanel", "Bleu de Chanel", 8, true],
    ["e2e-marque-chanel", "Coco Mademoiselle", 1, true],
    ["e2e-marque-chanel", "N°5", null, true],
    ["e2e-marque-chanel", "Allure Homme Sport", 5, false],
    ["e2e-marque-ysl", "Libre", 6, true],
    ["e2e-marque-ysl", "Y", 2, true],
    ["e2e-marque-ysl", "Black Opium", null, true],
    ["e2e-marque-ysl", "La Nuit de l'Homme", 0, false],
    ["e2e-marque-guerlain", "Shalimar", 4, true],
    ["e2e-marque-guerlain", "L'Homme Idéal", null, true],
    ["e2e-marque-guerlain", "Mon Guerlain", 9, true],
    ["e2e-marque-guerlain", "Habit Rouge", 3, true],
    ["e2e-marque-lattafa", "Khamrah", 20, true],
    ["e2e-marque-lattafa", "Asad", 15, true],
    ["e2e-marque-lattafa", "Yara", null, true],
    ["e2e-marque-lattafa", "Oud Mood", 0, true],
  ] as const,
  customers: [
    { id: seedEntityId("clientfares"), fullName: "Fares Benali", phoneE164: "+33612345678", snapchat: "fares.b" },
    { id: seedEntityId("clientlina"), fullName: "Lina Haddad", phoneE164: "+33698765432", snapchat: null },
    { id: seedEntityId("clientelise"), fullName: "Élise Martin", phoneE164: null, snapchat: "elise.m" },
    { id: seedEntityId("clientyanis"), fullName: "Yanis Cherif", phoneE164: "+33700000001", snapchat: null },
    { id: seedEntityId("clientsarah"), fullName: "Sarah Kaci", phoneE164: null, snapchat: null },
  ],
  batch: { id: seedEntityId("lotmars"), name: "Commande de mars" },
  /** Visuels story déjà rangés (06 E16 zone 7 « 3 visuels ») : sur Khamrah, servis par `public/`. */
  storyVisuals: { perfume: "Khamrah", count: 3 },
} as const;

/**
 * Identifiant attendu d'un parfum du jeu : base neuve, séquence à 1, parfums insérés dans l'ordre de
 * `SEED.perfumes`. `seedE2e` vérifie que la base a bien donné ces identifiants (les adresses d'écran de
 * `e2e/routes.ts` sont écrites avant toute connexion à la base).
 */
export function seedPerfumeId(name: (typeof SEED.perfumes)[number][1]): number {
  return SEED.perfumes.findIndex((perfume) => perfume[1] === name) + 1;
}

export async function seedE2e(db: PrismaClient): Promise<void> {
  await db.pocket.createMany({
    data: SEED.pockets.map((p) => ({ ...p, kind: p.kind, openingBalance: "0" })),
  });
  await db.setting.create({ data: { id: 1, defaultExchangeRate: "277", defaultPocketId: SEED.pockets[1].id } });
  await db.brand.createMany({
    data: SEED.brands.map(({ key: _key, ...b }) => ({ ...b, catalogMode: "CURATED", status: "PUBLISHED" })),
  });
  const brandIds = new Map<string, string>(SEED.brands.map((b) => [b.key, b.id]));
  await db.perfume.createMany({
    data: SEED.perfumes.map(([brandKey, name, stock, published]) => ({
      brandId: brandIds.get(brandKey) as string,
      name,
      stock,
      image: IMAGE,
      status: published ? "PUBLISHED" : "DRAFT",
    })),
  });
  const sauvage = await db.perfume.findFirstOrThrow({ where: { name: "Sauvage" }, select: { id: true } });
  await db.perfumePricing.createMany({
    data: [
      { perfumeId: sauvage.id, volumeMl: 80, defaultUnitPriceEur: "120", defaultUnitCostDzd: "22000", defaultExchangeRate: "277" },
      { perfumeId: sauvage.id, volumeMl: 50, defaultUnitPriceEur: "85", defaultUnitCostDzd: "15000", defaultExchangeRate: "277" },
      // Composeur (07 J9) : les deux parfums vendus le plus récemment ont leur mémoire de prix du 80 ml (N8).
      { perfumeId: seedPerfumeId("Asad"), volumeMl: 80, defaultUnitPriceEur: "120", defaultUnitCostDzd: "22000", defaultExchangeRate: "277" },
      { perfumeId: seedPerfumeId("J'adore"), volumeMl: 80, defaultUnitPriceEur: "150", defaultUnitCostDzd: "26000", defaultExchangeRate: "277" },
    ],
  });
  const ids = await db.perfume.findMany({ select: { id: true, name: true } });
  for (const perfume of ids) {
    if (perfume.id !== seedPerfumeId(perfume.name as (typeof SEED.perfumes)[number][1])) {
      throw new Error(`Seed e2e : ${perfume.name} a reçu l'identifiant ${perfume.id}, attendu ${seedPerfumeId(perfume.name as never)}.`);
    }
  }
  const storyPerfume = seedPerfumeId(SEED.storyVisuals.perfume);
  await db.perfumeMedia.createMany({
    data: Array.from({ length: SEED.storyVisuals.count }, (_, index) => ({
      id: `e2e-visuel-${index + 1}`,
      perfumeId: storyPerfume,
      path: `stories/${storyPerfume}/175750000000${index}-0000000${index}.webp`,
      url: IMAGE,
      label: index === 0 ? "Story 9:16" : null,
      width: 1080,
      height: 1920,
      bytes: 120_000,
      sortOrder: index,
    })),
  });
  await db.customer.createMany({ data: SEED.customers.map((c) => ({ ...c })) });
  await db.batch.create({
    data: { ...SEED.batch, status: "OPEN", expectedAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  });
  // Commandes, ventes et paiements des écrans J8 (fiche document, Commandes, À encaisser) : `documents.ts`.
  await seedDocuments(db, {
    image: IMAGE,
    pockets: { cash: SEED.pockets[1].id, bank: SEED.pockets[2].id },
    customers: Object.fromEntries(SEED.customers.map((c) => [c.fullName.split(" ")[0] as string, c.id])),
    perfumeId: (name) => seedPerfumeId(name as (typeof SEED.perfumes)[number][1]),
    brandOf: (name) => SEED.brands.find((b) => b.key === SEED.perfumes.find((p) => p[1] === name)?.[0])?.name ?? null,
    batchId: SEED.batch.id,
  });
}

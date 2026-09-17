import type { PrismaClient } from "@prisma/client";

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

export const SEED = {
  pockets: [
    { id: "e2e-poche-non-attribue", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, sortOrder: 0 },
    { id: "e2e-poche-especes", name: "Espèces", kind: "CASH", isSystem: false, sortOrder: 1 },
    { id: "e2e-poche-banque", name: "Banque", kind: "BANK", isSystem: false, sortOrder: 2 },
  ],
  brands: [
    { id: "e2e-marque-dior", name: "Dior", slug: "dior" },
    { id: "e2e-marque-chanel", name: "Chanel", slug: "chanel" },
    { id: "e2e-marque-ysl", name: "Yves Saint Laurent", slug: "yves-saint-laurent" },
    { id: "e2e-marque-guerlain", name: "Guerlain", slug: "guerlain" },
    { id: "e2e-marque-lattafa", name: "Lattafa", slug: "lattafa" },
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
    { id: "e2e-client-fares", fullName: "Fares Benali", phoneE164: "+33612345678", snapchat: "fares.b" },
    { id: "e2e-client-lina", fullName: "Lina Haddad", phoneE164: "+33698765432", snapchat: null },
    { id: "e2e-client-elise", fullName: "Élise Martin", phoneE164: null, snapchat: "elise.m" },
    { id: "e2e-client-yanis", fullName: "Yanis Cherif", phoneE164: "+33700000001", snapchat: null },
    { id: "e2e-client-sarah", fullName: "Sarah Kaci", phoneE164: null, snapchat: null },
  ],
  batch: { id: "e2e-lot-mars", name: "Commande de mars" },
} as const;

export async function seedE2e(db: PrismaClient): Promise<void> {
  await db.pocket.createMany({
    data: SEED.pockets.map((p) => ({ ...p, kind: p.kind, openingBalance: "0" })),
  });
  await db.setting.create({ data: { id: 1, defaultExchangeRate: "277", defaultPocketId: "e2e-poche-especes" } });
  await db.brand.createMany({ data: SEED.brands.map((b) => ({ ...b, catalogMode: "CURATED", status: "PUBLISHED" })) });
  await db.perfume.createMany({
    data: SEED.perfumes.map(([brandId, name, stock, published]) => ({
      brandId,
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
    ],
  });
  await db.customer.createMany({ data: SEED.customers.map((c) => ({ ...c })) });
  await db.batch.create({
    data: { ...SEED.batch, status: "OPEN", expectedAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  });
}

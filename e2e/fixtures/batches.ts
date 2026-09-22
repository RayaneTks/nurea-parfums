import type { PrismaClient } from "@prisma/client";
import { dzdToEur, parseDzdInput, parseRateInput, toDb } from "../../src/domain/money";
import { parisNoon } from "./documents";

/**
 * Jeu des écrans des lots (07 J13) : les lots et les documents dont E05, E06 et S13 ont besoin pour
 * être éprouvés PLEINS, plus un lot et un document DÉDIÉS au parcours `lot-depense` — pour que les
 * parcours lancés en parallèle ne se marchent jamais dessus (même convention que `documents.ts`).
 *
 * Le lot « Commande de mars » du jeu de base (`seed.ts`) reçoit ici ses documents et sa dépense : sans
 * eux, E06 ne montrerait que des listes vides et la sous-section « Annulés » ne serait jamais mesurée.
 *
 * Écrit en Prisma direct, comme le reste du jeu : un mouvement et sa pièce dans la MÊME transaction
 * (triggers différés de 03 §4.10), horodatages cohérents avec les CHECK.
 */

/** Identifiants UUID v4 fixes : les adresses d'écran de `e2e/routes.ts` s'écrivent avant toute base. */
const uuid = (n: number) => `e2e0b0a0-0000-4000-8000-${String(n).padStart(12, "0")}`;

/**
 * Identifiant à la forme d'un cuid, comme `seedEntityId` de `seed.ts` — recopié ici plutôt qu'importé :
 * `seed.ts` importe ce module, et un cycle d'imports pour trois lignes ne se justifie pas. La longueur
 * est calculée, jamais comptée à la main : un identifiant d'un caractère de trop est refusé par
 * `entityId` (« Cet élément n'est plus reconnu »), et l'écran le dirait au pire moment.
 */
const cuid = (label: string) => `c${`e2e${label}`.replace(/[^a-z0-9]/g, "").padEnd(24, "0").slice(0, 24)}`;

export const BATCHES = {
  /** Lot clos : la section « Clos » repliée de E05, et le refus de rattachement de S13. */
  closed: { id: cuid("lotclos"), name: "Commande de janvier" },
  /** Lot du parcours PC-08 : sa dépense et sa Marge nette n'appartiennent qu'à lui. */
  depense: { id: cuid("lotdepense"), name: "Commande d'octobre" },
  /**
   * Lot d'arrivée de la variante « ranger ce qui n'a pas de lot ». Distinct de `depense` : un document
   * rattaché change la Marge nette de son lot, et deux parcours lancés en parallèle se marcheraient
   * dessus (même raison que « un document dédié à chaque parcours », `documents.ts`).
   */
  rangement: { id: cuid("lotrangement"), name: "Commande de novembre" },
} as const;

/** Documents rattachés à « Commande de mars » : une vente soldée, une commande en attente, une annulée. */
export const BATCH_DOCS = {
  /** Vente livrée et encaissée : elle porte l'Encaissé et les coûts d'achat du lot. */
  sale: uuid(1),
  /** Commande EN ATTENTE : listée sur E06, hors « À encaisser » et hors « Coûts d'achat ». */
  pending: uuid(2),
  /** Commande annulée : sous-section repliée « Annulés · 1 », et raison du refus de suppression. */
  cancelled: uuid(3),
  /** Vente du parcours PC-08, sur son lot : sa Marge nette est celle que le parcours lit. */
  depense: uuid(4),
  /**
   * Commande LIVRÉE sans lot, dédiée à la variante « ranger ce qui n'a pas de lot » : elle n'appartient
   * qu'à ce parcours, qui la déplace — aucun autre ne la lit (convention de `documents.ts`).
   *
   * Préfixe `e2e0f0a0` et commande du JOUR : « À rattacher » range du plus récent au plus ancien, puis
   * par identifiant décroissant. Ce document est donc toujours la PREMIÈRE rangée — celle que le
   * parcours touche pour prouver son budget de 3 taps, sans dépendre du reste du jeu de données.
   */
  aRattacher: "e2e0f0a0-0000-4000-8000-000000000001",
} as const;

/** Client de la commande à rattacher : il ne désigne qu'une ligne, dans toute la base de test. */
export const A_RATTACHER_CUSTOMER = "Racha Meziane";

/** Libellé de la dépense déjà saisie : le chip que PC-08 touche au lieu de retaper « Transport ». */
export const KNOWN_EXPENSE_LABEL = "Transport";

export const SEEDED_EXPENSE = { id: cuid("depensemars"), label: KNOWN_EXPENSE_LABEL, amount: "45" } as const;

const RATE = "277";

type Spec = {
  id: string;
  /** `null` : document sans lot, candidat de « À rattacher » et de S13. */
  batchId: string | null;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  customer: string;
  ordered: number;
  confirmed?: number;
  delivered?: number;
  cancelled?: number;
  perfume: string;
  price: string;
  /** Coût en dinars ; `null` : coût à compléter. */
  cost: string | null;
  paid?: { amount: string; day: number };
};

export type SeedBatchesContext = {
  image: string;
  /** Poche des encaissements semés. */
  pocketId: string;
  /** Lot « Commande de mars » du jeu de base. */
  marsBatchId: string;
  perfumeId: (name: string) => number;
  brandOf: (name: string) => string | null;
};

export async function seedBatches(db: PrismaClient, ctx: SeedBatchesContext): Promise<void> {
  await db.batch.createMany({
    data: [
      { ...BATCHES.closed, status: "CLOSED", expectedAt: parisNoon(-40) },
      { ...BATCHES.depense, status: "OPEN", expectedAt: parisNoon(21) },
      { ...BATCHES.rangement, status: "OPEN", expectedAt: parisNoon(35) },
    ],
  });

  const specs: Spec[] = [
    {
      id: BATCH_DOCS.sale,
      batchId: ctx.marsBatchId,
      origin: "DIRECT_SALE",
      status: "DELIVERED",
      customer: "Nour Belkacem",
      ordered: -15,
      confirmed: -15,
      delivered: -15,
      perfume: "Khamrah",
      price: "200",
      // 27 700 DZD au taux 277 = 100,00 € tout rond : les montants de l'écran se lisent sans arrondi.
      cost: "27700",
      paid: { amount: "200", day: -15 },
    },
    {
      id: BATCH_DOCS.pending,
      batchId: ctx.marsBatchId,
      origin: "ORDER",
      status: "PENDING",
      customer: "Amine Ould",
      ordered: -4,
      perfume: "Asad",
      price: "110",
      cost: "18000",
    },
    {
      id: BATCH_DOCS.cancelled,
      batchId: ctx.marsBatchId,
      origin: "ORDER",
      status: "CANCELLED",
      customer: "Samir Touati",
      ordered: -9,
      cancelled: -6,
      perfume: "Yara",
      price: "80",
      cost: "13000",
    },
    {
      id: BATCH_DOCS.depense,
      batchId: BATCHES.depense.id,
      origin: "DIRECT_SALE",
      status: "DELIVERED",
      customer: "Imane Ferhat",
      ordered: -7,
      confirmed: -7,
      delivered: -7,
      perfume: "Oud Mood",
      price: "300",
      // 41 550 DZD au taux 277 = 150,00 € : Marge nette du lot = 300 − 150 = 150,00 €, sans dépense.
      cost: "41550",
      paid: { amount: "300", day: -7 },
    },
    {
      id: BATCH_DOCS.aRattacher,
      batchId: null,
      origin: "ORDER",
      status: "DELIVERED",
      customer: A_RATTACHER_CUSTOMER,
      ordered: 0,
      confirmed: 0,
      delivered: 0,
      perfume: "Shalimar",
      price: "130",
      cost: "20000",
      paid: { amount: "130", day: 0 },
    },
  ];

  for (const spec of specs) {
    const dzd = spec.cost ? parseDzdInput(spec.cost) : null;
    const rate = parseRateInput(RATE);
    await db.$transaction(async (tx) => {
      await tx.saleDocument.create({
        data: {
          id: spec.id,
          origin: spec.origin,
          status: spec.status,
          batchId: spec.batchId,
          customerName: spec.customer,
          orderedAt: parisNoon(spec.ordered),
          confirmedAt: spec.confirmed === undefined ? null : parisNoon(spec.confirmed),
          deliveredAt: spec.delivered === undefined ? null : parisNoon(spec.delivered),
          cancelledAt: spec.cancelled === undefined ? null : parisNoon(spec.cancelled),
          lines: {
            create: [
              {
                position: 0,
                perfumeId: ctx.perfumeId(spec.perfume),
                perfumeName: spec.perfume,
                brandName: ctx.brandOf(spec.perfume),
                imageUrl: ctx.image,
                volumeMl: 80,
                quantity: 1,
                deliveredQuantity: spec.status === "DELIVERED" ? 1 : 0,
                unitPriceEur: spec.price,
                unitCostDzd: dzd ? toDb(dzd) : null,
                exchangeRate: dzd && rate ? toDb(rate) : null,
                unitCostEur: dzd && rate ? toDb(dzdToEur(dzd, rate)) : null,
              },
            ],
          },
        },
      });
      if (spec.paid) {
        const movement = await tx.cashMovement.create({
          data: { pocketId: ctx.pocketId, amount: spec.paid.amount, kind: "PAYMENT", occurredAt: parisNoon(spec.paid.day) },
        });
        await tx.payment.create({ data: { documentId: spec.id, kind: "BALANCE", movementId: movement.id } });
      }
    });
  }

  // La dépense déjà saisie de « Commande de mars » : son libellé alimente les chips de S12 (A10).
  await db.$transaction(async (tx) => {
    const movement = await tx.cashMovement.create({
      data: {
        pocketId: ctx.pocketId,
        amount: `-${SEEDED_EXPENSE.amount}`,
        kind: "EXPENSE",
        occurredAt: parisNoon(-12),
        label: SEEDED_EXPENSE.label,
      },
    });
    await tx.batchExpense.create({
      data: { id: SEEDED_EXPENSE.id, batchId: ctx.marsBatchId, label: SEEDED_EXPENSE.label, movementId: movement.id },
    });
  });
}

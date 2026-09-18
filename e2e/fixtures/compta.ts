import type { PrismaClient } from "@prisma/client";
import { dzdToEur, parseDzdInput, parseRateInput, toDb } from "../../src/domain/money";
import { parisDayKey, parseParisDayKey } from "../../src/domain/periods";

/**
 * Jeu des écrans de la Compta (07 J12 ; 06 E03, E04, S14–S16, S19, S21), écrit en Prisma direct comme le reste du
 * jeu e2e (paiement ou dépense et leur mouvement dans la MÊME transaction : triggers différés de 03 §4.10).
 *
 * Isolement des parcours lancés en parallèle : les parcours de J8 encaissent AUJOURD'HUI dans « Espèces ». Les
 * chiffres confrontés à la requête canonique se lisent donc sur des mois où personne n'écrit :
 * - `COMPTA_MONTH` (il y a deux mois) : ventes, commande au coût à compléter, dépense de lot, argent non attribué ;
 * - `JOURNAL_MONTH` (il y a trois mois) : 45 ajustements dans « Banque », rien d'autre (les documents de J8 datent
 *   de 40 jours au plus).
 * Les transferts éprouvent deux poches dédiées, « Coffre » et « Compte pro » (`e2e/fixtures/seed.ts`).
 */

const uuid = (n: number) => `e2e0d0c0-0000-4000-8000-${String(n).padStart(12, "0")}`;

/**
 * Rangs 70+ : les documents de `e2e/fixtures/documents.ts` occupent 1…60 sous le MÊME motif d'identifiant.
 * Les rangs 40 à 43, choisis à J12, sont entrés en collision avec les fiches client de J10 (`noraSale`…) à la
 * fusion des deux jalons — le seed échouait sur la clé primaire. Corrigé à J15.
 */
export const COMPTA_DOCS = {
  /** Vente directe payée, rattachée au lot « Commande de mars ». */
  sale: uuid(70),
  /** Commande confirmée par un acompte, coût à compléter. */
  unknownCost: uuid(71),
  /** Vente directe encaissée sans poche : l'argent attend dans « Non attribué ». */
  unassigned: uuid(72),
  /** Vente à crédit du mois M-5, soldée le mois suivant : un mois à coûts sans Encaissé (S19 sans pourcentage). */
  credit: uuid(73),
} as const;

export const COMPTA_PASSING = {
  unknownCost: "Nora Belkacem",
  unassigned: "Walid Ferhat",
} as const;

/** Montant encaissé dans « Non attribué » (PC-11 : « Ranger 60,00 € dans Espèces »). */
export const UNASSIGNED_AMOUNT = "60";

export const JOURNAL_MOVEMENTS = 45;

/** Premier jour du mois décalé de `months` (Paris), en clé « AAAA-MM-JJ ». */
function monthStart(months: number, now: Date = new Date()): string {
  const [year, month] = parisDayKey(now).split("-").map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1));
  return shifted.toISOString().slice(0, 10);
}

/** Ce jour du mois décalé, à midi heure de Paris. */
function monthDayNoon(months: number, day: number): Date {
  const key = `${monthStart(months).slice(0, 8)}${String(day).padStart(2, "0")}`;
  return new Date((parseParisDayKey(key) as Date).getTime() + 12 * 60 * 60 * 1000);
}

/** Mois des chiffres de la Compta : il y a deux mois. `ref` de l'écran et « AAAA-MM ». */
export const COMPTA_MONTH = { offset: -2, ref: () => `${monthStart(-2).slice(0, 8)}10`, key: () => monthStart(-2).slice(0, 7) };

/** Mois du journal à 45 mouvements : il y a trois mois. */
export const JOURNAL_MONTH = { offset: -3, key: () => monthStart(-3).slice(0, 7) };

/** Mois d'une vente à crédit sans aucun encaissement (il y a cinq mois) : Marge nette sans pourcentage. */
export const NO_CASH_MONTH = { offset: -5, ref: () => `${monthStart(-5).slice(0, 8)}10` };

const RATE = "277";

function costEur(dzd: string): { unitCostDzd: string; exchangeRate: string; unitCostEur: string } {
  const cost = parseDzdInput(dzd) as NonNullable<ReturnType<typeof parseDzdInput>>;
  const rate = parseRateInput(RATE) as NonNullable<ReturnType<typeof parseRateInput>>;
  return { unitCostDzd: toDb(cost), exchangeRate: toDb(rate), unitCostEur: toDb(dzdToEur(cost, rate)) };
}

export type SeedComptaContext = {
  image: string;
  pockets: { cash: string; bank: string; unassigned: string };
  customers: Record<string, string>;
  batchId: string;
  perfumeId: (name: string) => number;
};

export async function seedCompta(db: PrismaClient, ctx: SeedComptaContext): Promise<void> {
  const month = COMPTA_MONTH.offset;
  const day10 = monthDayNoon(month, 10);
  const day12 = monthDayNoon(month, 12);

  await db.$transaction(async (tx) => {
    await tx.saleDocument.create({
      data: {
        id: COMPTA_DOCS.sale,
        origin: "DIRECT_SALE",
        status: "DELIVERED",
        customerId: ctx.customers.Fares ?? null,
        batchId: ctx.batchId,
        orderedAt: day10,
        confirmedAt: day10,
        deliveredAt: day10,
        lines: {
          create: [
            {
              position: 0,
              perfumeId: ctx.perfumeId("Sauvage"),
              perfumeName: "Sauvage",
              brandName: "Dior",
              imageUrl: ctx.image,
              volumeMl: 80,
              quantity: 1,
              deliveredQuantity: 1,
              unitPriceEur: "120",
              ...costEur("22000"),
            },
          ],
        },
      },
    });
    const movement = await tx.cashMovement.create({ data: { pocketId: ctx.pockets.bank, amount: "120", kind: "PAYMENT", occurredAt: day10 } });
    await tx.payment.create({ data: { documentId: COMPTA_DOCS.sale, kind: "BALANCE", method: "Virement", movementId: movement.id } });
  });

  await db.$transaction(async (tx) => {
    await tx.saleDocument.create({
      data: {
        id: COMPTA_DOCS.unknownCost,
        origin: "ORDER",
        status: "CONFIRMED",
        customerName: COMPTA_PASSING.unknownCost,
        orderedAt: day10,
        confirmedAt: day10,
        expectedDeliveryAt: null,
        lines: {
          create: [
            {
              position: 0,
              perfumeId: ctx.perfumeId("Libre"),
              perfumeName: "Libre",
              brandName: "Yves Saint Laurent",
              imageUrl: ctx.image,
              volumeMl: 50,
              quantity: 1,
              unitPriceEur: "95",
            },
          ],
        },
      },
    });
    const movement = await tx.cashMovement.create({ data: { pocketId: ctx.pockets.cash, amount: "40", kind: "PAYMENT", occurredAt: day10 } });
    await tx.payment.create({ data: { documentId: COMPTA_DOCS.unknownCost, kind: "DEPOSIT", method: "Espèces", movementId: movement.id } });
  });

  await db.$transaction(async (tx) => {
    await tx.saleDocument.create({
      data: {
        id: COMPTA_DOCS.unassigned,
        origin: "DIRECT_SALE",
        status: "DELIVERED",
        customerName: COMPTA_PASSING.unassigned,
        orderedAt: day12,
        confirmedAt: day12,
        deliveredAt: day12,
        lines: {
          create: [
            {
              position: 0,
              perfumeId: ctx.perfumeId("Khamrah"),
              perfumeName: "Khamrah",
              brandName: "Lattafa",
              imageUrl: ctx.image,
              volumeMl: 50,
              quantity: 1,
              deliveredQuantity: 1,
              unitPriceEur: UNASSIGNED_AMOUNT,
              ...costEur("8000"),
            },
          ],
        },
      },
    });
    const movement = await tx.cashMovement.create({
      data: { pocketId: ctx.pockets.unassigned, amount: UNASSIGNED_AMOUNT, kind: "PAYMENT", occurredAt: day12 },
    });
    await tx.payment.create({ data: { documentId: COMPTA_DOCS.unassigned, kind: "BALANCE", movementId: movement.id } });
  });

  // Dépense de lot du même mois : « Dépenses déduites » et S19.
  await db.$transaction(async (tx) => {
    const movement = await tx.cashMovement.create({ data: { pocketId: ctx.pockets.bank, amount: "-45", kind: "EXPENSE", occurredAt: day12 } });
    await tx.batchExpense.create({ data: { batchId: ctx.batchId, label: "Transport", movementId: movement.id } });
  });

  // Vente à crédit : engagée il y a cinq mois (ses coûts y comptent), soldée il y a quatre mois.
  await db.$transaction(async (tx) => {
    const sold = monthDayNoon(NO_CASH_MONTH.offset, 10);
    await tx.saleDocument.create({
      data: {
        id: COMPTA_DOCS.credit,
        origin: "DIRECT_SALE",
        status: "DELIVERED",
        customerId: ctx.customers.Lina ?? null,
        orderedAt: sold,
        confirmedAt: sold,
        deliveredAt: sold,
        lines: {
          create: [
            {
              position: 0,
              perfumeId: ctx.perfumeId("Shalimar"),
              perfumeName: "Shalimar",
              brandName: "Guerlain",
              imageUrl: ctx.image,
              volumeMl: 80,
              quantity: 1,
              deliveredQuantity: 1,
              unitPriceEur: "110",
              ...costEur("20000"),
            },
          ],
        },
      },
    });
    const movement = await tx.cashMovement.create({
      data: { pocketId: ctx.pockets.cash, amount: "110", kind: "PAYMENT", occurredAt: monthDayNoon(NO_CASH_MONTH.offset + 1, 10) },
    });
    await tx.payment.create({ data: { documentId: COMPTA_DOCS.credit, kind: "BALANCE", method: "Espèces", movementId: movement.id } });
  });

  // Journal : 45 ajustements dans « Banque », trois mois plus tôt, montants variés des deux signes, somme positive.
  const journal = Array.from({ length: JOURNAL_MOVEMENTS }, (_, index) => {
    const cents = (index + 1) * 137;
    const sign = index % 3 === 2 ? "-" : "";
    return {
      pocketId: ctx.pockets.bank,
      kind: "ADJUSTMENT" as const,
      amount: `${sign}${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`,
      occurredAt: monthDayNoon(JOURNAL_MONTH.offset, (index % 27) + 1),
      label: `Recomptage ${index + 1}`,
    };
  });
  await db.cashMovement.createMany({ data: journal });
}

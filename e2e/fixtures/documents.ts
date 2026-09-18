import type { PrismaClient } from "@prisma/client";
import { dzdToEur, parseDzdInput, parseRateInput, toDb } from "../../src/domain/money";
import { parisDayKey, parseParisDayKey } from "../../src/domain/periods";

/**
 * Documents des tests de bout en bout du jalon J8 (06 §1.8, 07 J8) : chaque cas de la fiche document (commande en
 * attente, confirmée partiellement livrée avec dû, livrée soldée, vente directe avec dû, annulée avec paiements, au
 * coût à compléter), les sections de la liste Commandes, les créances d'À encaisser — et un document DÉDIÉ à
 * chaque parcours (`e2e/parcours/*`), pour que les parcours lancés en parallèle ne se marchent jamais dessus.
 *
 * Écrits en Prisma direct, comme le reste du jeu : un paiement et son mouvement dans la MÊME transaction (triggers
 * différés de 03 §4.10), horodatages cohérents avec les CHECK (`confirmedAt` ⇔ engagé, `deliveredAt` ⇔ livré,
 * `cancelledAt` ⇔ annulé), quantités livrées bornées. Les dates sont relatives au jour de Paris de l'exécution.
 */

/** Identifiants UUID v4 fixes : les adresses `?doc=` de `e2e/routes.ts` s'écrivent avant toute base. */
const uuid = (n: number) => `e2e0d0c0-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const DOCS = {
  // ── Cas d'affichage (06 §1.8) ────────────────────────────────────────────────
  pending: uuid(1),
  partial: uuid(2),
  deliveredPaid: uuid(3),
  saleDue: uuid(4),
  cancelled: uuid(5),
  unknownCost: uuid(6),
  late: uuid(7),
  undated: uuid(8),
  // ── Un document par parcours ─────────────────────────────────────────────────
  acompte: uuid(20),
  readyPaid: uuid(21),
  solde: uuid(22),
  voidPayment: uuid(23),
  creance: uuid(24),
  toutA: uuid(25),
  toutB: uuid(26),
  toutC: uuid(27),
  offline: uuid(28),
  lecture: uuid(29),
  // ── Composeur Vendre (07 J9) ─────────────────────────────────────────────────
  /** Ventes les plus récentes du jeu : Asad et J'adore en tête de « Vendus récemment » (N7). */
  recentAsad: uuid(40),
  recentJadore: uuid(41),
  /** Vente d'une fiche liée, rattachée au lot ouvert : l'origine de « Refaire » (A-9). */
  refaire: uuid(42),
} as const;

/** Noms des clients de passage des parcours : chacun désigne une seule ligne dans les listes. */
export const PASSING = {
  acompte: "Mehdi Larbi",
  readyPaid: "Rayan Bouzid",
  solde: "Lucas Meyer",
  voidPayment: "Rania Saadi",
  creance: "Hugo Martin",
  tout: "Sofia Amrani",
  offline: "Paul Girard",
  lecture: "Adam Cherki",
} as const;

type LineSpec = {
  perfume: string;
  volumeMl: 10 | 50 | 80;
  quantity: number;
  delivered?: number;
  price: string;
  /** Coût en dinars (taux 277) ; `null` : coût à compléter. */
  cost?: string | null;
  note?: string;
};

type PaymentSpec = { kind: "DEPOSIT" | "BALANCE"; amount: string; pocket: "cash" | "bank"; day: number };

type DocumentSpec = {
  id: string;
  origin: "ORDER" | "DIRECT_SALE";
  status: "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  /** Prénom d'un client du jeu, ou nom d'un client de passage. */
  customer: { linked: string } | { passing: string };
  /** Jours relatifs à aujourd'hui (Paris) : −3 = il y a trois jours. */
  ordered: number;
  confirmed?: number;
  delivered?: number;
  cancelled?: number;
  expected?: number | null;
  lines: LineSpec[];
  payments?: PaymentSpec[];
  notes?: string;
  /**
   * Document le plus récent du jeu (07 J9) : tous ses instants valent `recentInstant()` — après les documents datés
   * de midi, pour tenir « Vendus récemment » quel que soit l'heure de l'exécution.
   */
  recent?: boolean;
  /** Rattaché au lot ouvert du jeu. */
  batch?: boolean;
};

const cost = (value: string) => ({ cost: value });

export const DOCUMENT_SPECS: DocumentSpec[] = [
  {
    id: DOCS.pending,
    origin: "ORDER",
    status: "PENDING",
    customer: { linked: "Lina" },
    ordered: -1,
    expected: 1,
    lines: [{ perfume: "Libre", volumeMl: 50, quantity: 1, price: "95", ...cost("16000") }],
  },
  {
    id: DOCS.partial,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { linked: "Fares" },
    ordered: -2,
    confirmed: -1,
    expected: 0,
    lines: [
      { perfume: "Sauvage", volumeMl: 80, quantity: 2, delivered: 1, price: "120", ...cost("22000"), note: "Coffret cadeau" },
      { perfume: "Miss Dior", volumeMl: 50, quantity: 1, price: "95", ...cost("15000") },
    ],
    payments: [{ kind: "DEPOSIT", amount: "100", pocket: "cash", day: -1 }],
    notes: "Livrer après 18 h",
  },
  {
    id: DOCS.deliveredPaid,
    origin: "ORDER",
    status: "DELIVERED",
    customer: { linked: "Élise" },
    ordered: -6,
    confirmed: -6,
    delivered: -2,
    lines: [{ perfume: "Shalimar", volumeMl: 80, quantity: 1, delivered: 1, price: "110", ...cost("20000") }],
    payments: [{ kind: "BALANCE", amount: "110", pocket: "bank", day: -2 }],
  },
  {
    id: DOCS.saleDue,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { linked: "Yanis" },
    ordered: -40,
    confirmed: -40,
    delivered: -40,
    lines: [{ perfume: "J'adore", volumeMl: 80, quantity: 1, delivered: 1, price: "150", ...cost("26000") }],
    payments: [{ kind: "BALANCE", amount: "50", pocket: "cash", day: -40 }],
  },
  {
    id: DOCS.cancelled,
    origin: "ORDER",
    status: "CANCELLED",
    customer: { passing: "Nadia Brahimi" },
    ordered: -5,
    cancelled: -2,
    expected: -1,
    lines: [{ perfume: "Coco Mademoiselle", volumeMl: 50, quantity: 1, price: "90", ...cost("16000") }],
    payments: [{ kind: "DEPOSIT", amount: "40", pocket: "cash", day: -5 }],
  },
  {
    id: DOCS.unknownCost,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { linked: "Sarah" },
    ordered: -3,
    confirmed: -3,
    expected: 10,
    lines: [{ perfume: "Black Opium", volumeMl: 80, quantity: 1, price: "130", cost: null }],
    payments: [{ kind: "DEPOSIT", amount: "30", pocket: "cash", day: -3 }],
  },
  {
    id: DOCS.late,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { passing: "Karim Haddou" },
    ordered: -7,
    confirmed: -7,
    expected: -3,
    lines: [{ perfume: "N°5", volumeMl: 50, quantity: 1, price: "100", ...cost("18000") }],
    payments: [{ kind: "DEPOSIT", amount: "100", pocket: "bank", day: -7 }],
  },
  {
    id: DOCS.undated,
    origin: "ORDER",
    status: "PENDING",
    customer: { passing: "Inès Moreau" },
    ordered: -1,
    expected: null,
    lines: [{ perfume: "Mon Guerlain", volumeMl: 50, quantity: 1, price: "80", ...cost("14000") }],
  },
  // ── Parcours ───────────────────────────────────────────────────────────────
  {
    id: DOCS.acompte,
    origin: "ORDER",
    status: "PENDING",
    customer: { passing: PASSING.acompte },
    ordered: 0,
    expected: 1,
    lines: [
      { perfume: "Bleu de Chanel", volumeMl: 80, quantity: 2, price: "100", ...cost("17000") },
      { perfume: "Habit Rouge", volumeMl: 50, quantity: 1, price: "60", ...cost("10000") },
    ],
  },
  {
    id: DOCS.readyPaid,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { passing: PASSING.readyPaid },
    ordered: -2,
    confirmed: -2,
    expected: 0,
    lines: [{ perfume: "L'Homme Idéal", volumeMl: 80, quantity: 1, price: "90", ...cost("15000") }],
    payments: [{ kind: "DEPOSIT", amount: "90", pocket: "cash", day: -2 }],
  },
  {
    id: DOCS.solde,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { passing: PASSING.solde },
    ordered: -4,
    confirmed: -4,
    expected: 2,
    lines: [{ perfume: "Yara", volumeMl: 80, quantity: 1, price: "120", ...cost("20000") }],
    payments: [{ kind: "DEPOSIT", amount: "20", pocket: "cash", day: -4 }],
  },
  {
    id: DOCS.voidPayment,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { passing: PASSING.voidPayment },
    ordered: -2,
    confirmed: -2,
    expected: 3,
    lines: [{ perfume: "Y", volumeMl: 50, quantity: 1, price: "120", ...cost("20000") }],
    payments: [{ kind: "DEPOSIT", amount: "40", pocket: "cash", day: -2 }],
  },
  {
    id: DOCS.creance,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { passing: PASSING.creance },
    ordered: -10,
    confirmed: -10,
    delivered: -10,
    lines: [{ perfume: "Libre", volumeMl: 80, quantity: 1, delivered: 1, price: "100", ...cost("17000") }],
    payments: [{ kind: "BALANCE", amount: "20", pocket: "cash", day: -10 }],
  },
  {
    id: DOCS.toutA,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { passing: PASSING.tout },
    ordered: -20,
    confirmed: -20,
    delivered: -20,
    lines: [{ perfume: "Khamrah", volumeMl: 50, quantity: 1, delivered: 1, price: "50", ...cost("8000") }],
  },
  {
    id: DOCS.toutB,
    origin: "ORDER",
    status: "DELIVERED",
    customer: { passing: PASSING.tout },
    ordered: -12,
    confirmed: -12,
    delivered: -10,
    lines: [{ perfume: "Asad", volumeMl: 50, quantity: 1, delivered: 1, price: "40", ...cost("7000") }],
  },
  {
    id: DOCS.toutC,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { passing: PASSING.tout },
    ordered: -5,
    confirmed: -5,
    expected: 6,
    lines: [{ perfume: "Oud Mood", volumeMl: 10, quantity: 1, price: "40", ...cost("6000") }],
    payments: [{ kind: "DEPOSIT", amount: "10", pocket: "cash", day: -5 }],
  },
  {
    id: DOCS.offline,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { passing: PASSING.offline },
    ordered: -8,
    confirmed: -8,
    delivered: -8,
    lines: [{ perfume: "Mon Guerlain", volumeMl: 50, quantity: 1, delivered: 1, price: "70", ...cost("12000") }],
  },
  {
    id: DOCS.lecture,
    origin: "ORDER",
    status: "CONFIRMED",
    customer: { passing: PASSING.lecture },
    ordered: -3,
    confirmed: -3,
    expected: 4,
    lines: [{ perfume: "Sauvage", volumeMl: 50, quantity: 1, price: "150", ...cost("15000") }],
    payments: [{ kind: "DEPOSIT", amount: "50", pocket: "bank", day: -3 }],
  },
  // ── Composeur Vendre (07 J9) ─────────────────────────────────────────────────
  {
    id: DOCS.recentAsad,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { passing: "Nour Belkacem" },
    ordered: 0,
    confirmed: 0,
    delivered: 0,
    recent: true,
    lines: [{ perfume: "Asad", volumeMl: 80, quantity: 1, delivered: 1, price: "120", ...cost("22000") }],
    payments: [{ kind: "BALANCE", amount: "120", pocket: "cash", day: 0 }],
  },
  {
    id: DOCS.recentJadore,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { passing: "Nour Belkacem" },
    ordered: 0,
    confirmed: 0,
    delivered: 0,
    recent: true,
    lines: [{ perfume: "J'adore", volumeMl: 80, quantity: 1, delivered: 1, price: "150", ...cost("26000") }],
    payments: [{ kind: "BALANCE", amount: "150", pocket: "cash", day: 0 }],
  },
  {
    id: DOCS.refaire,
    origin: "DIRECT_SALE",
    status: "DELIVERED",
    customer: { linked: "Élise" },
    ordered: -15,
    confirmed: -15,
    delivered: -15,
    batch: true,
    lines: [
      { perfume: "Yara", volumeMl: 50, quantity: 2, delivered: 2, price: "60", ...cost("9000") },
      { perfume: "N°5", volumeMl: 80, quantity: 1, delivered: 1, price: "140", ...cost("25000") },
    ],
    payments: [{ kind: "BALANCE", amount: "260", pocket: "bank", day: -15 }],
  },
];

/** Instant des documents « récents » du jeu : une minute après midi (Paris), ou après maintenant si l'on est plus tard. */
export function recentInstant(now: Date = new Date()): Date {
  return new Date(Math.max(now.getTime(), parisNoon(0, now).getTime()) + 60_000);
}

/** Midi, heure de Paris, du jour décalé de `offset` jours : jamais à cheval sur minuit. */
export function parisNoon(offset: number, now: Date = new Date()): Date {
  const [year, month, day] = parisDayKey(now).split("-").map(Number) as [number, number, number];
  const key = new Date(Date.UTC(year, month - 1, day + offset)).toISOString().slice(0, 10);
  return new Date((parseParisDayKey(key) as Date).getTime() + 12 * 60 * 60 * 1000);
}

/** Minuit, heure de Paris, du jour décalé : une livraison prévue « sans heure » (03 §3). */
function parisMidnight(offset: number): Date {
  return new Date(parisNoon(offset).getTime() - 12 * 60 * 60 * 1000);
}

const RATE = "277";

export type SeedDocumentsContext = {
  image: string;
  pockets: { cash: string; bank: string };
  /** Prénom → identifiant de fiche. */
  customers: Record<string, string>;
  perfumeId: (name: string) => number;
  brandOf: (name: string) => string | null;
  /** Le lot ouvert du jeu (documents `batch: true`). */
  batchId: string;
};

export async function seedDocuments(db: PrismaClient, ctx: SeedDocumentsContext): Promise<void> {
  const recent = recentInstant();
  for (const spec of DOCUMENT_SPECS) {
    const linked = "linked" in spec.customer ? ctx.customers[spec.customer.linked] : undefined;
    if ("linked" in spec.customer && !linked) throw new Error(`Seed e2e : client inconnu « ${spec.customer.linked} ».`);
    const at = (day: number) => (spec.recent ? recent : parisNoon(day));
    await db.$transaction(async (tx) => {
      await tx.saleDocument.create({
        data: {
          id: spec.id,
          origin: spec.origin,
          status: spec.status,
          customerId: linked ?? null,
          customerName: "passing" in spec.customer ? spec.customer.passing : null,
          batchId: spec.batch ? ctx.batchId : null,
          orderedAt: at(spec.ordered),
          expectedDeliveryAt: spec.expected === undefined || spec.expected === null ? null : parisMidnight(spec.expected),
          confirmedAt: spec.confirmed === undefined ? null : at(spec.confirmed),
          deliveredAt: spec.delivered === undefined ? null : at(spec.delivered),
          cancelledAt: spec.cancelled === undefined ? null : at(spec.cancelled),
          notes: spec.notes ?? null,
          lines: {
            create: spec.lines.map((line, position) => {
              const dzd = line.cost ? parseDzdInput(line.cost) : null;
              const rate = parseRateInput(RATE);
              return {
                position,
                perfumeId: ctx.perfumeId(line.perfume),
                perfumeName: line.perfume,
                brandName: ctx.brandOf(line.perfume),
                imageUrl: ctx.image,
                volumeMl: line.volumeMl,
                quantity: line.quantity,
                deliveredQuantity: line.delivered ?? 0,
                unitPriceEur: line.price,
                unitCostDzd: dzd ? toDb(dzd) : null,
                exchangeRate: dzd && rate ? toDb(rate) : null,
                unitCostEur: dzd && rate ? toDb(dzdToEur(dzd, rate)) : null,
                note: line.note ?? null,
              };
            }),
          },
        },
      });
      for (const payment of spec.payments ?? []) {
        const movement = await tx.cashMovement.create({
          data: { pocketId: ctx.pockets[payment.pocket], amount: payment.amount, kind: "PAYMENT", occurredAt: at(payment.day) },
        });
        await tx.payment.create({ data: { documentId: spec.id, kind: payment.kind, movementId: movement.id } });
      }
    });
  }
}

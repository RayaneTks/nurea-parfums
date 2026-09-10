import { prisma } from "@/lib/db/prisma";
import Decimal from "decimal.js-light";
import { orderSearchWhere, saleSearchWhere } from "@/server/search/filters";
import { cache } from "react";

export type BatchStatus = "OPEN" | "CLOSED";

/**
 * KPIs cash-basis. On affiche que du concret :
 *  - cashedRevenue : encaissé réel (totalRevenue − remainingDue par vente).
 *  - outstandingRevenue : reste à encaisser (somme remainingDue). Affiché en badge si > 0.
 *  - totalCost : coût des parfums (déjà payé, peu importe encaissement client).
 *  - expenses : dépenses opérationnelles du lot.
 *  - netMargin : cashedRevenue − totalCost − expenses (marge nette concrète).
 *  - marginPct : netMargin / cashedRevenue × 100.
 *
 * `totalRevenue` (facturé) reste exposé pour audit / debug mais l'UI doit utiliser cashedRevenue.
 */
export type BatchRowLite = {
  id: string;
  name: string;
  status: BatchStatus;
  expectedAt: string | null;
  notes: string | null;
  createdAt: string;
  salesCount: number;
  /**
   * Commandes confirmées rattachées au lot (READY/DELIVERED sans vente).
   * Comptées séparément des ventes parce qu'elles alimentent les mêmes
   * montants : afficher « 0 vente » à côté de 295 € encaissés était faux.
   */
  ordersCount: number;
  totalRevenue: string;
  cashedRevenue: string;
  outstandingRevenue: string;
  totalCost: string;
  expenses: string;
  netMargin: string;
  marginPct: string;
};

export type BatchExpenseRow = {
  id: string;
  label: string;
  amount: string;
  occurredAt: string;
  notes: string | null;
};

export type BatchSaleRow = {
  id: string;
  customerName: string;
  soldAt: string;
  totalRevenue: string;
  cashedRevenue: string;
  remainingDue: string;
  netMargin: string;
  itemCount: number;
};

export type BatchOrderRow = {
  id: string;
  customerName: string;
  /** « En attente » incluse : la fiche affiche l'appartenance, pas la maturité. */
  status: "PENDING" | "READY" | "DELIVERED";
  orderedAt: string;
  total: string;
  cashed: string;
  due: string;
};

export type BatchDetail = BatchRowLite & {
  sales: BatchSaleRow[];
  orders: BatchOrderRow[];
  expensesList: BatchExpenseRow[];
};

function computeKpis(opts: {
  totalRevenue: Decimal;
  outstanding: Decimal;
  totalCost: Decimal;
  expenses: Decimal;
}): {
  cashedRevenue: string;
  outstandingRevenue: string;
  netMargin: string;
  marginPct: string;
} {
  const cashed = opts.totalRevenue.minus(opts.outstanding);
  const net = cashed.minus(opts.totalCost).minus(opts.expenses);
  const pct = cashed.greaterThan(0)
    ? net.dividedBy(cashed).times(100).toFixed(1)
    : "0.0";
  return {
    cashedRevenue: cashed.toFixed(2),
    outstandingRevenue: opts.outstanding.toFixed(2),
    netMargin: net.toFixed(2),
    marginPct: pct,
  };
}

/**
 * Mémoïsé par rendu (`react.cache`) : plusieurs blocs du tableau de bord
 * demandent les mêmes agrégats. Sans ça, chaque bloc rouvrait un aller-retour
 * vers une base distante, et l'écran attendait la même réponse deux fois.
 */
export const listBatches = cache(async (): Promise<BatchRowLite[]> => {
  const batches = await prisma.batch.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      status: true,
      expectedAt: true,
      notes: true,
      createdAt: true,
      sales: {
        select: {
          totalRevenue: true,
          totalCost: true,
          remainingDue: true,
        },
      },
      orders: {
        where: { status: { in: ["READY", "DELIVERED"] }, sale: null },
        select: {
          items: { select: { unitPrice: true, quantity: true, unitCost: true } },
          payments: { select: { type: true, amount: true } },
        },
      },
      expenses: {
        select: { amount: true },
      },
      _count: { select: { sales: true, orders: true } },
    },
  });

  return batches.map((b) => {
    let rev = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.totalRevenue.toString())),
      new Decimal(0),
    );
    let cost = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.totalCost.toString())),
      new Decimal(0),
    );
    let outstanding = b.sales.reduce(
      (acc, s) => acc.plus(new Decimal(s.remainingDue.toString())),
      new Decimal(0),
    );
    for (const o of b.orders) {
      const oTotal = o.items.reduce(
        (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
        new Decimal(0),
      );
      const oCost = o.items.reduce(
        (acc, it) => acc.plus(new Decimal(it.unitCost.toString()).times(it.quantity)),
        new Decimal(0),
      );
      let paid = new Decimal(0);
      for (const p of o.payments) {
        const a = new Decimal(p.amount.toString());
        paid = p.type === "REFUND" ? paid.minus(a) : paid.plus(a);
      }
      const oDue = oTotal.greaterThan(paid) ? oTotal.minus(paid) : new Decimal(0);
      rev = rev.plus(oTotal);
      cost = cost.plus(oCost);
      outstanding = outstanding.plus(oDue);
    }
    const exp = b.expenses.reduce(
      (acc, e) => acc.plus(new Decimal(e.amount.toString())),
      new Decimal(0),
    );
    const kpis = computeKpis({
      totalRevenue: rev,
      outstanding,
      totalCost: cost,
      expenses: exp,
    });
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      expectedAt: b.expectedAt ? b.expectedAt.toISOString() : null,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      salesCount: b._count.sales,
      ordersCount: b.orders.length,
      totalRevenue: rev.toFixed(2),
      cashedRevenue: kpis.cashedRevenue,
      outstandingRevenue: kpis.outstandingRevenue,
      totalCost: cost.toFixed(2),
      expenses: exp.toFixed(2),
      netMargin: kpis.netMargin,
      marginPct: kpis.marginPct,
    };
  });
})

export async function getBatchById(id: string): Promise<BatchDetail | null> {
  const b = await prisma.batch.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      expectedAt: true,
      notes: true,
      createdAt: true,
      sales: {
        orderBy: { soldAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customer: { select: { fullName: true } },
          soldAt: true,
          totalRevenue: true,
          totalCost: true,
          remainingDue: true,
          _count: { select: { items: true } },
        },
      },
      orders: {
        /*
         * La fiche montre TOUT ce qui est rattaché, y compris une commande en
         * attente. Le filtre de statut masquait un rattachement bien réel : la
         * commande disparaissait de la fiche sans être détachée, et resurgissait
         * des semaines plus tard en repassant « à traiter ». Le filtre appartient
         * au calcul des montants, pas à l'affichage de l'appartenance.
         */
        where: { status: { not: "CANCELLED" }, sale: null },
        orderBy: { orderedAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customer: { select: { fullName: true } },
          status: true,
          orderedAt: true,
          items: { select: { unitPrice: true, quantity: true, unitCost: true } },
          payments: { select: { type: true, amount: true } },
        },
      },
      expenses: {
        orderBy: { occurredAt: "desc" },
        select: {
          id: true,
          label: true,
          amount: true,
          occurredAt: true,
          notes: true,
        },
      },
    },
  });
  if (!b) return null;

  // Ventes liées au lot.
  let rev = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.totalRevenue.toString())),
    new Decimal(0),
  );
  let cost = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.totalCost.toString())),
    new Decimal(0),
  );
  let outstanding = b.sales.reduce(
    (acc, s) => acc.plus(new Decimal(s.remainingDue.toString())),
    new Decimal(0),
  );

  /*
   * Commandes CONFIRMÉES liées au lot (mêmes règles que la compta).
   *
   * La liste affichée inclut désormais les commandes en attente — pour qu'un
   * rattachement soit toujours visible et détachable — mais elles n'entrent
   * pas dans les montants : rien n'a été encaissé, et faire peser sur la marge
   * d'un envoi une commande que le client n'a pas encore engagée donnerait un
   * chiffre que personne ne pourrait retrouver en caisse.
   */
  for (const o of b.orders) {
    if (o.status === "PENDING") continue;
    const oTotal = o.items.reduce(
      (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
      new Decimal(0),
    );
    const oCost = o.items.reduce(
      (acc, it) => acc.plus(new Decimal(it.unitCost.toString()).times(it.quantity)),
      new Decimal(0),
    );
    let paid = new Decimal(0);
    for (const p of o.payments) {
      const a = new Decimal(p.amount.toString());
      paid = p.type === "REFUND" ? paid.minus(a) : paid.plus(a);
    }
    const oDue = oTotal.greaterThan(paid) ? oTotal.minus(paid) : new Decimal(0);
    rev = rev.plus(oTotal);
    cost = cost.plus(oCost);
    outstanding = outstanding.plus(oDue);
  }

  const exp = b.expenses.reduce(
    (acc, e) => acc.plus(new Decimal(e.amount.toString())),
    new Decimal(0),
  );
  const kpis = computeKpis({
    totalRevenue: rev,
    outstanding,
    totalCost: cost,
    expenses: exp,
  });

  return {
    id: b.id,
    name: b.name,
    status: b.status,
    expectedAt: b.expectedAt ? b.expectedAt.toISOString() : null,
    notes: b.notes,
    createdAt: b.createdAt.toISOString(),
    salesCount: b.sales.length,
    /*
     * Le compteur suit les montants, pas la liste : `orders` inclut désormais
     * les commandes en attente pour qu'un rattachement reste visible, mais
     * annoncer « 3 commandes » à côté d'un encaissé qui n'en reflète que deux
     * ferait mentir la carte.
     */
    ordersCount: b.orders.filter((o) => o.status !== "PENDING").length,
    totalRevenue: rev.toFixed(2),
    cashedRevenue: kpis.cashedRevenue,
    outstandingRevenue: kpis.outstandingRevenue,
    totalCost: cost.toFixed(2),
    expenses: exp.toFixed(2),
    netMargin: kpis.netMargin,
    marginPct: kpis.marginPct,
    sales: b.sales.map((s) => {
      const saleRev = new Decimal(s.totalRevenue.toString());
      const saleCost = new Decimal(s.totalCost.toString());
      const saleDue = new Decimal(s.remainingDue.toString());
      const saleCashed = saleRev.minus(saleDue);
      return {
        id: s.id,
        customerName: s.customer?.fullName ?? s.customerName ?? "Anonyme",
        soldAt: s.soldAt.toISOString(),
        totalRevenue: saleRev.toFixed(2),
        cashedRevenue: saleCashed.toFixed(2),
        remainingDue: saleDue.toFixed(2),
        netMargin: saleCashed.minus(saleCost).toFixed(2),
        itemCount: s._count.items,
      };
    }),
    orders: b.orders.map((o) => {
      const oTotal = o.items.reduce(
        (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
        new Decimal(0),
      );
      let paid = new Decimal(0);
      for (const p of o.payments) {
        const a = new Decimal(p.amount.toString());
        paid = p.type === "REFUND" ? paid.minus(a) : paid.plus(a);
      }
      const cashed = paid.greaterThan(oTotal) ? oTotal : paid.greaterThan(0) ? paid : new Decimal(0);
      const due = oTotal.greaterThan(paid) ? oTotal.minus(paid) : new Decimal(0);
      return {
        id: o.id,
        customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
        status: o.status as "PENDING" | "READY" | "DELIVERED",
        orderedAt: o.orderedAt.toISOString(),
        total: oTotal.toFixed(2),
        cashed: cashed.toFixed(2),
        due: due.toFixed(2),
      };
    }),
    expensesList: b.expenses.map((e) => ({
      id: e.id,
      label: e.label,
      amount: e.amount.toString(),
      occurredAt: e.occurredAt.toISOString(),
      notes: e.notes,
    })),
  };
}

/**
 * Liste légère pour selects/dropdowns (ex: assigner une vente à un lot).
 * Limite aux batches OPEN par défaut, ordre récents.
 */
export async function listOpenBatchesLite(): Promise<
  Array<{ id: string; name: string; status: BatchStatus }>
> {
  const rows = await prisma.batch.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true },
    take: 50,
  });
  return rows;
}

/* ─── Ce qui n'est rattaché à aucun lot ─────────────────────────────────── */

export type UnbatchedKind = "order" | "sale";

export type UnbatchedRow = {
  kind: UnbatchedKind;
  id: string;
  customerName: string;
  /** Statut de la commande ; absent pour une vente, qui est déjà encaissée. */
  status: "PENDING" | "READY" | "DELIVERED" | null;
  /** Date de commande ou date de vente, selon la nature de la ligne. */
  at: string;
  total: string;
  due: string;
  itemCount: number;
  /** Ce qui identifie la ligne d'un coup d'œil : les parfums qu'elle contient. */
  summary: string;
};

export type UnbatchedResult = {
  rows: UnbatchedRow[];
  counts: { orders: number; sales: number };
  /** Lignes non affichées faute de place. Jamais tronqué en silence. */
  truncated: number;
};

const UNBATCHED_LIMIT = 100;

function snapshotName(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const name = (snapshot as { name?: unknown }).name;
  return typeof name === "string" && name.trim() !== "" ? name : null;
}

/** « Sauvage, Libre +2 » — de quoi reconnaître un envoi sans ouvrir la fiche. */
function summarize(names: Array<string | null>): string {
  const kept = names.filter((n): n is string => n !== null);
  if (kept.length === 0) return "—";
  const head = kept.slice(0, 2).join(", ");
  return kept.length > 2 ? `${head} +${kept.length - 2}` : head;
}

/**
 * Tout ce qui n'appartient à aucun lot — commandes ET ventes, livrées comprises.
 *
 * Rien ne montrait cet ensemble. La compta listait les commandes confirmées
 * sans distinguer celles déjà rangées, la fiche d'un lot ne parlait que de son
 * propre contenu, et une vente hors lot se noyait parmi les groupes clients.
 * L'inventaire de ce qu'il reste à ranger n'existait donc nulle part : on ne
 * peut pas rattacher ce qu'on ne voit pas.
 *
 * Les commandes livrées y figurent délibérément. Une livraison ne dispense pas
 * de rangement : c'est justement l'envoi terminé qu'on veut rattacher à son lot
 * pour lui imputer le transport et connaître sa marge réelle.
 *
 * Les commandes ANNULÉES sont écartées : elles ne pèsent sur la marge d'aucun
 * envoi. Celles qui ont déjà une vente le sont aussi — la vente porte alors le
 * rattachement, et les afficher toutes deux ferait compter le même envoi
 * deux fois.
 */
export async function listUnbatched(q?: string | null): Promise<UnbatchedResult> {
  const [orders, sales, orderCount, saleCount] = await Promise.all([
    prisma.order.findMany({
      where: { batchId: null, status: { not: "CANCELLED" }, sale: null, ...orderSearchWhere(q) },
      orderBy: { orderedAt: "desc" },
      take: UNBATCHED_LIMIT,
      select: {
        id: true,
        customerName: true,
        status: true,
        orderedAt: true,
        customer: { select: { fullName: true } },
        items: {
          select: {
            unitPrice: true,
            quantity: true,
            perfumeSnapshot: true,
            perfume: { select: { name: true } },
          },
        },
        payments: { select: { type: true, amount: true } },
      },
    }),
    prisma.sale.findMany({
      where: { batchId: null, ...saleSearchWhere(q) },
      orderBy: { soldAt: "desc" },
      take: UNBATCHED_LIMIT,
      select: {
        id: true,
        customerName: true,
        soldAt: true,
        totalRevenue: true,
        remainingDue: true,
        customer: { select: { fullName: true } },
        items: { select: { perfumeSnapshot: true, perfume: { select: { name: true } } } },
      },
    }),
    prisma.order.count({
      where: { batchId: null, status: { not: "CANCELLED" }, sale: null, ...orderSearchWhere(q) },
    }),
    prisma.sale.count({ where: { batchId: null, ...saleSearchWhere(q) } }),
  ]);

  const orderRows: UnbatchedRow[] = orders.map((o) => {
    const total = o.items.reduce<Decimal>(
      (acc, it) => acc.plus(new Decimal(it.unitPrice.toString()).times(it.quantity)),
      new Decimal(0),
    );
    let paid = new Decimal(0);
    for (const p of o.payments) {
      const a = new Decimal(p.amount.toString());
      paid = p.type === "REFUND" ? paid.minus(a) : paid.plus(a);
    }
    const due = total.greaterThan(paid) ? total.minus(paid) : new Decimal(0);
    return {
      kind: "order" as const,
      id: o.id,
      customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
      status: o.status as "PENDING" | "READY" | "DELIVERED",
      at: o.orderedAt.toISOString(),
      total: total.toFixed(2),
      due: due.toFixed(2),
      itemCount: o.items.length,
      summary: summarize(o.items.map((it) => it.perfume?.name ?? snapshotName(it.perfumeSnapshot))),
    };
  });

  const saleRows: UnbatchedRow[] = sales.map((s) => ({
    kind: "sale" as const,
    id: s.id,
    customerName: s.customer?.fullName ?? s.customerName ?? "Anonyme",
    status: null,
    at: s.soldAt.toISOString(),
    total: new Decimal(s.totalRevenue.toString()).toFixed(2),
    due: new Decimal(s.remainingDue.toString()).toFixed(2),
    itemCount: s.items.length,
    summary: summarize(s.items.map((it) => it.perfume?.name ?? snapshotName(it.perfumeSnapshot))),
  }));

  // Le plus récent en tête, quelle que soit sa nature : c'est l'ordre dans
  // lequel les envois se sont produits, donc celui dans lequel on les range.
  const rows = [...orderRows, ...saleRows].sort((a, b) => (a.at < b.at ? 1 : -1));

  return {
    rows,
    counts: { orders: orderCount, sales: saleCount },
    truncated: Math.max(0, orderCount - orders.length) + Math.max(0, saleCount - sales.length),
  };
}

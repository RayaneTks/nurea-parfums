/**
 * Backfill data après migration admin v2 (P1).
 *
 * À exécuter UNE FOIS après `prisma migrate deploy`, avant de switcher l'app sur la
 * nouvelle source de vérité (PaymentTransaction, Customer).
 *
 * Idempotent : safe à re-jouer (chaque étape vérifie l'existant avant d'écrire).
 *
 * Usage: dotenv -e .env.local -- tsx prisma/seed-migrate.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugifyName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function backfillCustomers() {
  console.log("→ Backfill Customer depuis Order.customerName…");
  const orders = await prisma.order.findMany({
    where: { customerId: null, customerName: { not: null } },
    select: { id: true, customerName: true },
  });
  if (orders.length === 0) {
    console.log("  rien à faire (0 commandes sans customerId).");
    return;
  }

  // Dédoublonne par nom normalisé.
  const byKey = new Map<string, { name: string; orderIds: string[] }>();
  for (const o of orders) {
    if (!o.customerName) continue;
    const key = slugifyName(o.customerName);
    const entry = byKey.get(key);
    if (entry) entry.orderIds.push(o.id);
    else byKey.set(key, { name: o.customerName.trim(), orderIds: [o.id] });
  }

  for (const { name, orderIds } of byKey.values()) {
    const existing = await prisma.customer.findFirst({
      where: { fullName: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    const customer = existing
      ? existing
      : await prisma.customer.create({ data: { fullName: name }, select: { id: true } });

    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { customerId: customer.id },
    });
    console.log(`  ${name}: ${orderIds.length} commande(s) liée(s) à customer ${customer.id}`);
  }
}

async function backfillPayments() {
  console.log("→ Backfill PaymentTransaction depuis Order.depositPaid/depositAmount…");
  const orders = await prisma.order.findMany({
    where: { depositPaid: true, depositAmount: { gt: 0 } },
    select: { id: true, depositAmount: true, orderedAt: true, payments: { select: { id: true } } },
  });

  let created = 0;
  for (const o of orders) {
    if (o.payments.length > 0) continue; // déjà migré
    await prisma.paymentTransaction.create({
      data: {
        orderId: o.id,
        type: "DEPOSIT",
        amount: o.depositAmount,
        paidAt: o.orderedAt,
        note: "Backfill migration admin v2",
      },
    });
    created += 1;
  }
  console.log(`  ${created} acompte(s) backfillé(s).`);
}

async function backfillPerfumePricing() {
  console.log("→ Backfill PerfumePricing depuis OrderItem + SaleItem…");
  const items = await prisma.orderItem.findMany({
    where: { perfumeId: { not: null }, unitPrice: { gt: 0 } },
    select: {
      perfumeId: true,
      volumeMl: true,
      unitPrice: true,
      unitCostDzd: true,
    },
    orderBy: { id: "desc" }, // priorité au plus récent
  });

  const seen = new Set<string>();
  let upserts = 0;
  for (const it of items) {
    if (it.perfumeId === null) continue;
    const key = `${it.perfumeId}_${it.volumeMl}`;
    if (seen.has(key)) continue;
    seen.add(key);

    await prisma.perfumePricing.upsert({
      where: { perfumeId_volumeMl: { perfumeId: it.perfumeId, volumeMl: it.volumeMl } },
      update: {}, // ne touche pas si déjà présent
      create: {
        perfumeId: it.perfumeId,
        volumeMl: it.volumeMl,
        defaultUnitPriceEur: it.unitPrice,
        defaultUnitCostDzd: it.unitCostDzd ?? null,
      },
    });
    upserts += 1;
  }
  console.log(`  ${upserts} prix par défaut backfillé(s).`);
}

async function seedAppSettings() {
  console.log("→ Seed AppSetting…");
  const existing = await prisma.appSetting.findUnique({ where: { key: "exchangeRateDzdEur" } });
  if (!existing) {
    await prisma.appSetting.create({
      data: { key: "exchangeRateDzdEur", value: "277" },
    });
    console.log("  exchangeRateDzdEur = 277 créé.");
  } else {
    console.log(`  exchangeRateDzdEur déjà présent (${existing.value}).`);
  }
}

async function backfillSaleCustomers() {
  console.log("→ Backfill Sale.customerId depuis Sale.order.customerId…");
  const sales = await prisma.sale.findMany({
    where: { customerId: null, orderId: { not: null } },
    select: { id: true, order: { select: { customerId: true } } },
  });
  let count = 0;
  for (const s of sales) {
    if (!s.order?.customerId) continue;
    await prisma.sale.update({
      where: { id: s.id },
      data: { customerId: s.order.customerId },
    });
    count += 1;
  }
  console.log(`  ${count} vente(s) liée(s) au client de leur commande.`);
}

async function main() {
  console.log("=== seed-migrate admin v2 ===");
  await backfillCustomers();
  await backfillPayments();
  await backfillPerfumePricing();
  await seedAppSettings();
  await backfillSaleCustomers();
  console.log("=== done ===");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

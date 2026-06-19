/**
 * Seed d'audit UX — données réalistes pour screenshots Playwright.
 * Usage : dotenv -e .env.local -- tsx prisma/seed-audit.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const IMG = "/placeholder.svg";

async function main() {
  // ── Marques + parfums ────────────────────────────────────────────────
  const creed = await prisma.brand.upsert({
    where: { name: "Creed" },
    create: { name: "Creed", slug: "creed", image: IMG, status: "PUBLISHED" },
    update: {},
  });
  const dior = await prisma.brand.upsert({
    where: { name: "Dior" },
    create: { name: "Dior", slug: "dior", image: IMG, status: "PUBLISHED" },
    update: {},
  });
  const mfk = await prisma.brand.upsert({
    where: { name: "Maison Francis Kurkdjian" },
    create: { name: "Maison Francis Kurkdjian", slug: "mfk", image: IMG, status: "PUBLISHED" },
    update: {},
  });

  const perfumeData = [
    { brandId: creed.id, name: "Aventus", slug: "creed-aventus" },
    { brandId: creed.id, name: "Green Irish Tweed", slug: "creed-git" },
    { brandId: dior.id, name: "Sauvage Elixir", slug: "dior-sauvage-elixir" },
    { brandId: dior.id, name: "Homme Intense", slug: "dior-homme-intense" },
    { brandId: mfk.id, name: "Baccarat Rouge 540", slug: "mfk-br540" },
    { brandId: mfk.id, name: "Grand Soir", slug: "mfk-grand-soir" },
  ];
  const perfumes = [];
  for (const p of perfumeData) {
    const row = await prisma.perfume.upsert({
      where: { slug: p.slug },
      create: { ...p, image: IMG, status: "PUBLISHED" },
      update: {},
    });
    perfumes.push(row);
    for (const volumeMl of [30, 50, 100]) {
      const base = volumeMl === 30 ? 45 : volumeMl === 50 ? 70 : 120;
      await prisma.perfumePricing.upsert({
        where: { perfumeId_volumeMl: { perfumeId: row.id, volumeMl } },
        create: {
          perfumeId: row.id,
          volumeMl,
          defaultUnitPriceEur: base,
          defaultUnitCostDzd: base * 300,
          defaultExchangeRate: 277,
        },
        update: {},
      });
    }
  }

  // ── Clients ──────────────────────────────────────────────────────────
  const customersData = [
    { fullName: "Yacine Benali", phoneE164: "+213661234567", whatsappE164: "+213661234567" },
    { fullName: "Amina Cherif", phoneE164: "+213770112233", snapchat: "amina.c" },
    { fullName: "Karim Haddad", phoneE164: "+213551998877" },
    { fullName: "Lina Boumediene", snapchat: "lina_b" },
    { fullName: "Sofiane Mansouri", phoneE164: "+213662003344", address: "Hydra, Alger" },
  ];
  const customers = [];
  for (const c of customersData) {
    const row = await prisma.customer.create({ data: c });
    customers.push(row);
  }

  // ── Lot (batch) ──────────────────────────────────────────────────────
  const batch = await prisma.batch.create({
    data: { name: "Commande Avril", status: "OPEN", notes: "Lot mensuel avril 2026." },
  });
  await prisma.batchExpense.createMany({
    data: [
      { batchId: batch.id, label: "Billet avion", amount: 280 },
      { batchId: batch.id, label: "Transport DHL", amount: 65 },
    ],
  });

  // ── Commandes (différents statuts) ───────────────────────────────────
  // PENDING (en attente)
  await prisma.order.create({
    data: {
      customerId: customers[0]!.id,
      customerName: customers[0]!.fullName,
      status: "PENDING",
      items: {
        create: [
          {
            perfumeId: perfumes[0]!.id,
            quantity: 1,
            volumeMl: 100,
            unitPrice: 120,
            unitCost: 38,
            unitCostDzd: 36000,
            exchangeRate: 277,
            perfumeSnapshot: { name: perfumes[0]!.name, brandName: "Creed", image: IMG },
          },
        ],
      },
    },
  });

  // READY (acompte payé)
  await prisma.order.create({
    data: {
      customerId: customers[1]!.id,
      customerName: customers[1]!.fullName,
      status: "READY",
      depositPaid: true,
      depositAmount: 50,
      deliveryAt: new Date(Date.now() + 3 * 86400000),
      items: {
        create: [
          {
            perfumeId: perfumes[4]!.id,
            quantity: 2,
            volumeMl: 50,
            unitPrice: 70,
            unitCost: 22,
            unitCostDzd: 21000,
            exchangeRate: 277,
            perfumeSnapshot: { name: perfumes[4]!.name, brandName: "MFK", image: IMG },
          },
        ],
      },
      payments: { create: [{ type: "DEPOSIT", amount: 50, method: "cash" }] },
    },
  });

  // ── Ventes (compta) rattachées au lot ────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const cust = customers[i % customers.length]!;
    const perf = perfumes[i % perfumes.length]!;
    const revenue = 120 + i * 10;
    const cost = 40 + i * 4;
    await prisma.sale.create({
      data: {
        customerId: cust.id,
        customerName: cust.fullName,
        batchId: batch.id,
        totalRevenue: revenue,
        totalCost: cost,
        totalMargin: revenue - cost,
        items: {
          create: [
            {
              perfumeId: perf.id,
              quantity: 1,
              volumeMl: 100,
              unitPrice: revenue,
              unitCost: cost,
              unitCostDzd: cost * 277,
              exchangeRate: 277,
              lineRevenue: revenue,
              lineCost: cost,
              lineMargin: revenue - cost,
              perfumeSnapshot: { name: perf.name, brandName: "—", image: IMG },
            },
          ],
        },
      },
    });
  }

  const counts = {
    brands: await prisma.brand.count(),
    perfumes: await prisma.perfume.count(),
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    sales: await prisma.sale.count(),
    batches: await prisma.batch.count(),
  };
  console.log("Seed audit OK:", JSON.stringify(counts));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });

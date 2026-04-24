import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const lineSelect = {
  id: true,
  buyPriceCents: true,
  sellPriceCents: true,
  quantity: true,
  perfume: {
    select: {
      id: true,
      name: true,
      slug: true,
      brand: { select: { id: true, name: true } },
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
    const cursor = searchParams.get("cursor");

    const sales = await prisma.cashSale.findMany({
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        note: true,
        createdAt: true,
        lines: { select: lineSelect },
      },
    });

    let nextCursor: string | null = null;
    let list = sales;
    if (sales.length > limit) {
      const next = sales.pop();
      nextCursor = next?.id ?? null;
      list = sales;
    }

    return NextResponse.json({ sales: list, nextCursor });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_VENTES_GET]", error);
    return NextResponse.json({ error: "Impossible de charger les ventes." }, { status: 500 });
  }
}

type LineInput = { perfumeId?: number; buyPriceCents?: number; sellPriceCents?: number; quantity?: number };

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const denied = requireEditor(auth);
    if (denied) return denied;

    let body: { note?: string | null; lines?: LineInput[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const linesRaw = Array.isArray(body.lines) ? body.lines : [];
    if (linesRaw.length === 0) {
      return NextResponse.json({ error: "Ajoutez au moins une ligne de vente." }, { status: 400 });
    }

    const normalized: { perfumeId: number; buyPriceCents: number; sellPriceCents: number; quantity: number }[] = [];
    for (const row of linesRaw) {
      const perfumeId = Number(row.perfumeId);
      const buyPriceCents = Math.round(Number(row.buyPriceCents));
      const sellPriceCents = Math.round(Number(row.sellPriceCents));
      const quantity = Math.round(Number(row.quantity));
      if (
        !Number.isFinite(perfumeId) ||
        perfumeId <= 0 ||
        !Number.isFinite(buyPriceCents) ||
        buyPriceCents < 0 ||
        !Number.isFinite(sellPriceCents) ||
        sellPriceCents < 0 ||
        !Number.isFinite(quantity) ||
        quantity < 1
      ) {
        return NextResponse.json(
          { error: "Chaque ligne doit avoir un parfum valide, des prix en centimes (≥ 0) et une quantité ≥ 1." },
          { status: 400 },
        );
      }
      normalized.push({ perfumeId, buyPriceCents, sellPriceCents, quantity });
    }

    const perfumeIds = [...new Set(normalized.map((l) => l.perfumeId))];
    const existing = await prisma.perfume.findMany({
      where: { id: { in: perfumeIds } },
      select: { id: true },
    });
    if (existing.length !== perfumeIds.length) {
      return NextResponse.json({ error: "Un ou plusieurs parfums sont introuvables." }, { status: 400 });
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : body.note === null ? null : undefined;

    const sale = await prisma.cashSale.create({
      data: {
        note: note ?? null,
        lines: {
          create: normalized.map((l) => ({
            perfumeId: l.perfumeId,
            buyPriceCents: l.buyPriceCents,
            sellPriceCents: l.sellPriceCents,
            quantity: l.quantity,
          })),
        },
      },
      select: {
        id: true,
        note: true,
        createdAt: true,
        lines: { select: lineSelect },
      },
    });

    await writeAudit(auth.sub, "cash_sale.create", "CashSale", sale.id, {
      lineCount: sale.lines.length,
    });

    return NextResponse.json({ sale });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_VENTES_POST]", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la vente." }, { status: 500 });
  }
}

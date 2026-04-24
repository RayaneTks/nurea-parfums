import { NextResponse } from "next/server";
import { CustomerOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

    const where =
      statusParam && Object.values(CustomerOrderStatus).includes(statusParam as CustomerOrderStatus)
        ? { status: statusParam as CustomerOrderStatus }
        : {};

    const orders = await prisma.customerOrder.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        details: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_COMMANDES_GET]", error);
    return NextResponse.json({ error: "Impossible de charger les commandes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const denied = requireEditor(auth);
    if (denied) return denied;

    let body: { customerName?: string; details?: string; note?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const customerName = (body.customerName ?? "").trim();
    const details = (body.details ?? "").trim();
    if (!customerName || !details) {
      return NextResponse.json({ error: "Le nom du client et le détail de la commande sont requis." }, { status: 400 });
    }
    const note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 2000) || null
        : body.note === null
          ? null
          : undefined;

    const order = await prisma.customerOrder.create({
      data: {
        customerName: customerName.slice(0, 200),
        details: details.slice(0, 8000),
        note: note ?? null,
      },
      select: {
        id: true,
        customerName: true,
        details: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeAudit(auth.sub, "customer_order.create", "CustomerOrder", order.id, {});

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_COMMANDES_POST]", error);
    return NextResponse.json({ error: "Impossible d’enregistrer la commande." }, { status: 500 });
  }
}

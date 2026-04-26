import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const saleInclude = {
  items: {
    include: {
      perfume: {
        select: {
          id: true,
          name: true,
          image: true,
          brand: { select: { id: true, name: true } },
        },
      },
    },
  },
  order: { select: { id: true, customerName: true, orderedAt: true } },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: saleInclude,
    });

    if (!sale) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    return NextResponse.json({ sale });
  } catch (error) {
    console.error("[api/admin/sales/[id]][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger la vente.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id } = await params;

    const existing = await prisma.sale.findUnique({
      where: { id },
      select: { id: true, orderId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    await prisma.sale.delete({ where: { id } });
    await writeAudit(ctx.sub, "sale.delete", "Sale", id, {
      orderId: existing.orderId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/sales/[id]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer la vente.");
  }
}

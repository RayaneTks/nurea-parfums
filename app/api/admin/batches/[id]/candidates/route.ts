import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type BatchCandidateSale = {
  id: string;
  customerName: string;
  soldAt: string;
  itemCount: number;
  totalRevenue: string;
  totalMargin: string;
};

/**
 * Liste les ventes éligibles à un rattachement de lot :
 * - non rattachées à un lot (`batchId = null`)
 * - OU déjà rattachées à CE lot (pour permettre la désélection)
 *
 * Renvoie un payload léger pour le picker (pas d'items).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const sales = await prisma.sale.findMany({
      where: {
        OR: [{ batchId: null }, { batchId: id }],
      },
      orderBy: { soldAt: "desc" },
      select: {
        id: true,
        customerName: true,
        soldAt: true,
        batchId: true,
        totalRevenue: true,
        totalMargin: true,
        _count: { select: { items: true } },
      },
    });

    const candidates: (BatchCandidateSale & { assigned: boolean })[] = sales.map((s) => ({
      id: s.id,
      customerName: s.customerName ?? "Client inconnu",
      soldAt: s.soldAt.toISOString(),
      itemCount: s._count.items,
      totalRevenue: s.totalRevenue.toString(),
      totalMargin: s.totalMargin.toString(),
      assigned: s.batchId === id,
    }));

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[api/admin/batches/[id]/candidates][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger les ventes candidates.");
  }
}

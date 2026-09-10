import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type BatchCandidateOrder = {
  id: string;
  customerName: string;
  orderedAt: string;
  itemCount: number;
  total: string;
  assigned: boolean;
};

/**
 * Liste les commandes éligibles à un rattachement de lot :
 * - status « À traiter » (READY) ou « Livrée » (DELIVERED) — pas PENDING
 * - non finalisées en vente (sale = null)
 * - non rattachées OU rattachées à CE lot
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const orders = await prisma.order.findMany({
      /*
       * Toute commande vivante est rattachable, « en attente » comprise.
       *
       * Le filtre READY/DELIVERED interdisait de ranger une commande fraîche —
       * c'est pourtant au moment où on la crée qu'on sait à quel envoi elle
       * appartient. Il rendait aussi indétachable une commande rattachée puis
       * repassée en attente : plus proposée ici, donc impossible à décocher,
       * alors qu'elle restait liée en base.
       *
       * Le calcul des montants du lot, lui, continue de ne compter que les
       * commandes confirmées : rattacher n'est pas encaisser.
       */
      where: {
        status: { not: "CANCELLED" },
        sale: null,
        OR: [{ batchId: null }, { batchId: id }],
      },
      orderBy: { orderedAt: "desc" },
      select: {
        id: true,
        customerName: true,
        customer: { select: { fullName: true } },
        orderedAt: true,
        batchId: true,
        status: true,
        items: { select: { unitPrice: true, quantity: true } },
      },
    });

    const candidates: BatchCandidateOrder[] = orders.map((o) => {
      const total = o.items.reduce((acc, it) => acc + Number(it.unitPrice) * it.quantity, 0);
      return {
        id: o.id,
        customerName: o.customer?.fullName ?? o.customerName ?? "Anonyme",
        orderedAt: o.orderedAt.toISOString(),
        itemCount: o.items.length,
        total: total.toFixed(2),
        assigned: o.batchId === id,
      };
    });

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("[api/admin/batches/[id]/order-candidates][GET]", error);
    return jsonFromPrismaGestionError(error, "Chargement impossible.");
  }
}

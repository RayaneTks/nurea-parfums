import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssignBody = {
  saleIds?: string[];
  /** Si true, détache les ventes (batchId=null) au lieu de les rattacher. */
  detach?: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id } = await params;

    let body: AssignBody;
    try {
      body = (await request.json()) as AssignBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const saleIds = Array.isArray(body.saleIds) ? body.saleIds.filter((s) => typeof s === "string") : [];
    if (saleIds.length === 0) {
      return NextResponse.json({ error: "Sélectionne au moins une vente." }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({ where: { id }, select: { id: true } });
    if (!batch) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }

    const nextBatchId = body.detach ? null : id;
    const result = await prisma.sale.updateMany({
      where: { id: { in: saleIds } },
      data: { batchId: nextBatchId },
    });

    await writeAudit(ctx.sub, body.detach ? "batch.detach" : "batch.assign", "Batch", id, {
      count: result.count,
      saleIds,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    console.error("[api/admin/batches/[id]/assign][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible d'assigner les ventes.");
  }
}

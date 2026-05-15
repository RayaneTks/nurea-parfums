import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssignBody = {
  /** IDs de ventes à rattacher à ce lot. */
  attach?: string[];
  /** IDs de ventes à détacher (passe batchId à null). */
  detach?: string[];
};

function sanitizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

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

    const attachIds = sanitizeIds(body.attach);
    const detachIds = sanitizeIds(body.detach);

    if (attachIds.length === 0 && detachIds.length === 0) {
      return NextResponse.json({ error: "Aucune modification à appliquer." }, { status: 400 });
    }

    const batch = await prisma.batch.findUnique({ where: { id }, select: { id: true } });
    if (!batch) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      let attached = 0;
      let detached = 0;
      if (attachIds.length > 0) {
        const r = await tx.sale.updateMany({
          where: { id: { in: attachIds } },
          data: { batchId: id },
        });
        attached = r.count;
      }
      if (detachIds.length > 0) {
        const r = await tx.sale.updateMany({
          where: { id: { in: detachIds }, batchId: id },
          data: { batchId: null },
        });
        detached = r.count;
      }
      return { attached, detached };
    });

    await writeAudit(ctx.sub, "batch.sync", "Batch", id, {
      attached: result.attached,
      detached: result.detached,
      attachIds,
      detachIds,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/admin/batches/[id]/assign][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible d'assigner les ventes.");
  }
}

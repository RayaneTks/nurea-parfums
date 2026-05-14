import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { getBatchById } from "@/server/batches/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PatchBatchBody = {
  name?: string;
  expectedAt?: string | null;
  notes?: string | null;
  status?: "OPEN" | "CLOSED";
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const batch = await getBatchById(id);
    if (!batch) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }
    return NextResponse.json({ batch });
  } catch (error) {
    console.error("[api/admin/batches/[id]][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger le lot.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id } = await params;
    let body: PatchBatchBody;
    try {
      body = (await request.json()) as PatchBatchBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const existing = await prisma.batch.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }

    const data: {
      name?: string;
      expectedAt?: Date | null;
      notes?: string | null;
      status?: "OPEN" | "CLOSED";
    } = {};

    if ("name" in body) {
      const name = body.name?.trim();
      if (!name || name.length < 2) {
        return NextResponse.json(
          { error: "Nom requis (minimum 2 caractères)." },
          { status: 400 },
        );
      }
      data.name = name;
    }
    if ("expectedAt" in body) {
      if (body.expectedAt === null || body.expectedAt === "") {
        data.expectedAt = null;
      } else if (body.expectedAt) {
        const d = new Date(body.expectedAt);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "Date invalide." }, { status: 400 });
        }
        data.expectedAt = d;
      }
    }
    if ("notes" in body) {
      data.notes = body.notes?.trim() || null;
    }
    if ("status" in body && body.status) {
      if (body.status !== "OPEN" && body.status !== "CLOSED") {
        return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      }
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
    }

    await prisma.batch.update({ where: { id }, data });
    await writeAudit(ctx.sub, "batch.update", "Batch", id, data);

    const batch = await getBatchById(id);
    return NextResponse.json({ batch });
  } catch (error) {
    console.error("[api/admin/batches/[id]][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de mettre à jour le lot.");
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
    const existing = await prisma.batch.findUnique({
      where: { id },
      select: { _count: { select: { sales: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }
    if (existing._count.sales > 0) {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer : des ventes sont rattachées au lot. Détache-les d'abord.",
        },
        { status: 409 },
      );
    }
    await prisma.batch.delete({ where: { id } });
    await writeAudit(ctx.sub, "batch.delete", "Batch", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/batches/[id]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer le lot.");
  }
}

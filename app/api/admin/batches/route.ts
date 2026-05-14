import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { listBatches, listOpenBatchesLite } from "@/server/batches/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CreateBatchBody = {
  name?: string;
  expectedAt?: string | null;
  notes?: string | null;
};

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    if (status === "OPEN") {
      const batches = await listOpenBatchesLite();
      return NextResponse.json({ batches });
    }
    const batches = await listBatches();
    return NextResponse.json({ batches });
  } catch (error) {
    console.error("[api/admin/batches][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger les lots.");
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    let body: CreateBatchBody;
    try {
      body = (await request.json()) as CreateBatchBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Nom requis (minimum 2 caractères)." },
        { status: 400 },
      );
    }

    let expectedAt: Date | null = null;
    if (body.expectedAt && body.expectedAt.trim().length > 0) {
      const d = new Date(body.expectedAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Date invalide." }, { status: 400 });
      }
      expectedAt = d;
    }

    const batch = await prisma.batch.create({
      data: {
        name,
        expectedAt,
        notes: body.notes?.trim() || null,
      },
    });

    await writeAudit(ctx.sub, "batch.create", "Batch", batch.id, { name });

    return NextResponse.json({ batch });
  } catch (error) {
    console.error("[api/admin/batches][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible de créer le lot.");
  }
}

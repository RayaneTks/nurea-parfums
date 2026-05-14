import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AddExpenseBody = {
  label?: string;
  amount?: number | string;
  occurredAt?: string | null;
  notes?: string | null;
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
    const batch = await prisma.batch.findUnique({ where: { id }, select: { id: true } });
    if (!batch) {
      return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    }

    let body: AddExpenseBody;
    try {
      body = (await request.json()) as AddExpenseBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const label = body.label?.trim();
    if (!label || label.length < 2) {
      return NextResponse.json(
        { error: "Libellé requis (minimum 2 caractères)." },
        { status: 400 },
      );
    }

    const amountN = Number(String(body.amount ?? "").replace(",", "."));
    if (!Number.isFinite(amountN) || amountN <= 0) {
      return NextResponse.json(
        { error: "Montant invalide (doit être > 0)." },
        { status: 400 },
      );
    }

    let occurredAt: Date = new Date();
    if (body.occurredAt && body.occurredAt.trim().length > 0) {
      const d = new Date(body.occurredAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Date invalide." }, { status: 400 });
      }
      occurredAt = d;
    }

    const expense = await prisma.batchExpense.create({
      data: {
        batchId: id,
        label,
        amount: new Prisma.Decimal(amountN),
        occurredAt,
        notes: body.notes?.trim() || null,
      },
    });

    await writeAudit(ctx.sub, "batch.expense.add", "Batch", id, {
      expenseId: expense.id,
      amount: amountN,
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("[api/admin/batches/[id]/expenses][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible d'ajouter la dépense.");
  }
}

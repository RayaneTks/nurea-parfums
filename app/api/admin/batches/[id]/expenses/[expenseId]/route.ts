import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { tagFor } from "@/lib/admin/cache-tags";
import { reverseMovementsFor, recordMovement } from "@/server/treasury/movements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Bascule une dépense entre « comptée » et « hors compta ».
 * - Vers hors compta : contre-passe le mouvement de trésorerie (l'argent revient).
 * - Vers comptée : recrée un mouvement de sortie (poche « Non attribué », à répartir).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id, expenseId } = await params;
    let body: { countInCompta?: boolean; pocketId?: string | null };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }
    if (typeof body.countInCompta !== "boolean") {
      return NextResponse.json({ error: "countInCompta requis (booléen)." }, { status: 400 });
    }

    const existing = await prisma.batchExpense.findUnique({
      where: { id: expenseId },
      select: { batchId: true, label: true, amount: true, occurredAt: true, countInCompta: true },
    });
    if (!existing || existing.batchId !== id) {
      return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
    }

    if (existing.countInCompta !== body.countInCompta) {
      await prisma.batchExpense.update({
        where: { id: expenseId },
        data: { countInCompta: body.countInCompta },
      });
      if (body.countInCompta) {
        // Redevient comptée → recrée la sortie de trésorerie.
        await recordMovement({
          pocketId: body.pocketId ?? null,
          amount: Number(existing.amount),
          kind: "EXPENSE_OUT",
          label: existing.label,
          refType: "BatchExpense",
          refId: expenseId,
          occurredAt: existing.occurredAt,
          createdById: ctx.sub,
        });
      } else {
        // Devient hors compta → l'argent ressort de la trésorerie (contre-passe).
        await reverseMovementsFor("BatchExpense", expenseId);
      }
      revalidateTag(tagFor.batches(), "default");
      revalidateTag(tagFor.kpi(), "default");
      revalidateTag(tagFor.treasury(), "default");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/batches/[id]/expenses/[expenseId]][PATCH]", error);
    return jsonFromPrismaGestionError(error, "Impossible de modifier la dépense.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; expenseId: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id, expenseId } = await params;
    const existing = await prisma.batchExpense.findUnique({
      where: { id: expenseId },
      select: { batchId: true },
    });
    if (!existing || existing.batchId !== id) {
      return NextResponse.json({ error: "Dépense introuvable." }, { status: 404 });
    }

    await prisma.batchExpense.delete({ where: { id: expenseId } });
    await reverseMovementsFor("BatchExpense", expenseId);
    await writeAudit(ctx.sub, "batch.expense.delete", "Batch", id, { expenseId });
    revalidateTag(tagFor.batches(), "default");
    revalidateTag(tagFor.kpi(), "default");
    revalidateTag(tagFor.treasury(), "default");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/batches/[id]/expenses/[expenseId]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer la dépense.");
  }
}

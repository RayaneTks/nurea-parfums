import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { tagFor } from "@/lib/admin/cache-tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    await writeAudit(ctx.sub, "batch.expense.delete", "Batch", id, { expenseId });
    revalidateTag(tagFor.batches(), "default");
    revalidateTag(tagFor.kpi(), "default");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/batches/[id]/expenses/[expenseId]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer la dépense.");
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const lineSelect = {
  id: true,
  buyPriceCents: true,
  sellPriceCents: true,
  quantity: true,
  perfume: {
    select: {
      id: true,
      name: true,
      slug: true,
      brand: { select: { id: true, name: true } },
    },
  },
} as const;

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const denied = requireEditor(auth);
    if (denied) return denied;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    const existing = await prisma.cashSale.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Vente introuvable." }, { status: 404 });
    }

    await prisma.cashSale.delete({ where: { id } });
    await writeAudit(auth.sub, "cash_sale.delete", "CashSale", id, {});

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_VENTE_DELETE]", error);
    return NextResponse.json({ error: "Impossible de supprimer la vente." }, { status: 500 });
  }
}

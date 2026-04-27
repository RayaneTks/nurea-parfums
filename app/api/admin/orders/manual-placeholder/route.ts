import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { prisma } from "@/lib/db/prisma";
import { ensureOrderManualPlaceholderPerfume } from "@/lib/gestion/orderManualPlaceholder";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Parfum technique pour les lignes « hors site » (libellé saisi à la main). */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const p = await ensureOrderManualPlaceholderPerfume(prisma);
    return NextResponse.json({
      perfume: {
        id: p.id,
        name: p.name,
        image: p.image,
        status: "DRAFT",
        brand: p.brand,
      },
    });
  } catch (error) {
    console.error("[api/admin/orders/manual-placeholder][GET]", error);
    return NextResponse.json(
      { error: "Impossible de préparer la ligne hors catalogue." },
      { status: 500 },
    );
  }
}

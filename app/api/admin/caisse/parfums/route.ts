import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/** Liste légère des parfums pour la sélection en caisse (select explicite). */
export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const perfumes = await prisma.perfume.findMany({
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        brand: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ perfumes });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_PARFUMS_GET]", error);
    return NextResponse.json({ error: "Impossible de charger les parfums." }, { status: 500 });
  }
}

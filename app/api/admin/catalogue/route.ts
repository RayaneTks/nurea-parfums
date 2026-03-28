import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    // Récupération simultanée en une seule transaction de lecture
    const [brands, perfumes] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { perfumes: true }
          }
        }
      }),
      prisma.perfume.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              image: true,
              catalogMode: true,
              status: true
            }
          }
        }
      })
    ]);

    return NextResponse.json({ brands, perfumes });
  } catch (error: any) {
    if (error.code === 'P2022') {
      console.error("[CATALOGUE_GET] Database schema out of sync (missing columns):", error.message);
      return NextResponse.json({ error: "Schéma de base de données non synchronisé. Veuillez exécuter 'npx prisma db push'." }, { status: 500 });
    }
    console.error("[CATALOGUE_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

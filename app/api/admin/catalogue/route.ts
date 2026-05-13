import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getCachedAdminCatalogue } from "@/lib/catalogue-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    const { brands, perfumes } = await getCachedAdminCatalogue();

    if (mode === "picker") {
      const pickerPerfumes = perfumes.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        status: p.status,
        brand: { id: p.brand.id, name: p.brand.name },
      }));
      return NextResponse.json({
        user: { username: auth.username, role: auth.role },
        perfumes: pickerPerfumes,
      });
    }

    return NextResponse.json({
      user: { username: auth.username, role: auth.role },
      brands,
      perfumes,
    });
  } catch (error: any) {
    if (error.code === 'P2022') {
      console.error("[CATALOGUE_GET] Database schema out of sync (missing columns):", error.message);
      return NextResponse.json({ error: "Schéma de base de données non synchronisé. Veuillez exécuter 'npx prisma db push'." }, { status: 500 });
    }
    console.error("[CATALOGUE_GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

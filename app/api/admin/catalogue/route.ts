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

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "picker") {
      const perfumes = await prisma.perfume.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          image: true,
          status: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      return NextResponse.json({
        user: { username: auth.username, role: auth.role },
        perfumes,
      });
    }

    const [brands, perfumes] = await Promise.all([
      prisma.brand.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          catalogMode: true,
          status: true,
          image: true,
          imageLight: true,
          _count: {
            select: { perfumes: true }
          }
        }
      }),
      prisma.perfume.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          image: true,
          imageLight: true,
          isFeatured: true,
          status: true,
          brand: {
            select: {
              id: true,
              name: true,
              image: true,
              imageLight: true,
              catalogMode: true,
              status: true
            }
          }
        }
      })
    ]);

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

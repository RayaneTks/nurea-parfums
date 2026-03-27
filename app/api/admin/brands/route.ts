import { NextResponse } from "next/server";
import { BrandCatalogMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { brandSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

const catalogModes = new Set<string>(Object.values(BrandCatalogMode));

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;

    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        catalogMode: true,
        image: true,
        _count: { select: { perfumes: true } },
      },
    });
    return NextResponse.json({ brands });
  } catch (error) {
    console.error("[api/admin/brands][GET]", error);
    return NextResponse.json(
      { error: "Impossible de charger les marques pour le moment." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    let body: { name?: string; catalogMode?: string; image?: string | null };
    try {
      body = (await request.json()) as { name?: string; catalogMode?: string; image?: string | null };
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }
    const name = (body.name ?? "").trim();
    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Nom de marque invalide (2–120 car.)." }, { status: 400 });
    }

    const modeRaw = (body.catalogMode ?? "CURATED").trim();
    if (!catalogModes.has(modeRaw)) {
      return NextResponse.json({ error: "Mode catalogue invalide." }, { status: 400 });
    }
    const image = body.image?.trim() || null;
    if (modeRaw === "COMPLETE" && !image) {
      return NextResponse.json({ error: "Image obligatoire en gamme complète." }, { status: 400 });
    }

    const data: {
      name: string;
      slug: string;
      catalogMode: BrandCatalogMode;
      image?: string | null;
    } = {
      name,
      slug: brandSlug(name),
      catalogMode: modeRaw as BrandCatalogMode,
    };

    if (image) data.image = image;

    const brand = await prisma.brand.create({ data });
    if (brand.catalogMode === "COMPLETE") {
      await prisma.perfume.updateMany({
        where: { brandId: brand.id },
        data: { status: "DRAFT" },
      });
    }
    await writeAudit(ctx.sub, "brand.create", "Brand", brand.id);
    return NextResponse.json({ brand });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Marque déjà existante ou slug en conflit." }, { status: 409 });
    }
    console.error("[api/admin/brands][POST]", error);
    return NextResponse.json(
      { error: "Impossible de créer la marque pour le moment." },
      { status: 500 },
    );
  }
}

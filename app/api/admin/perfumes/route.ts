import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { brandSlug, perfumeSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (statusParam && Object.values(PublicationStatus).includes(statusParam as PublicationStatus)) {
      where.status = statusParam as PublicationStatus;
    }

    const perfumes = await prisma.perfume.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ perfumes });
  } catch (error) {
    console.error("[api/admin/perfumes][GET]", error);
    return NextResponse.json(
      { error: "Impossible de charger les parfums pour le moment." },
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

    let body: {
      brandId?: string;
      brandName?: string;
      name?: string;
      image?: string;
      imageLight?: string | null;
      status?: PublicationStatus;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const brandId = (body.brandId ?? "").trim();
    const brandName = (body.brandName ?? "").trim();
    const name = (body.name ?? "").trim();
    const image = (body.image ?? "").trim();

    if (!name || !image || (!brandId && !brandName)) {
      return NextResponse.json(
        { error: "name, image et une marque sont requis." },
        { status: 400 }
      );
    }
    let brand = brandId
      ? await prisma.brand.findUnique({ where: { id: brandId } })
      : null;
    if (!brand && brandName) {
      brand = await prisma.brand.upsert({
        where: { name: brandName },
        update: { slug: brandSlug(brandName) },
        create: {
          name: brandName,
          slug: brandSlug(brandName),
          catalogMode: "CURATED",
        },
      });
    }
    if (!brand) {
      return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
    }
    if (brand.catalogMode === "COMPLETE") {
      return NextResponse.json(
        {
          error:
            "Cette marque est en gamme complète. Passez-la en mode sélection pour créer un parfum.",
        },
        { status: 400 },
      );
    }

    const maxRow = await prisma.perfume.aggregate({ _max: { id: true } });
    const nextId = (maxRow._max.id ?? 0) + 1;
    const slug = perfumeSlug(nextId, name, brand.name);
    const status =
      body.status && Object.values(PublicationStatus).includes(body.status) ? body.status : "DRAFT";

    const perfume = await prisma.perfume.create({
      data: {
        id: nextId,
        brandId: brand.id,
        name,
        slug,
        image,
        imageLight: body.imageLight?.trim() || null,
        status,
      },
      include: {
        brand: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/marque");
    await writeAudit(ctx.sub, "perfume.create", "Perfume", String(perfume.id), { name });
    return NextResponse.json({ perfume });
  } catch (error) {
    console.error("[api/admin/perfumes][POST]", error);
    return NextResponse.json(
      { error: "Impossible de créer ce parfum pour le moment." },
      { status: 500 },
    );
  }
}

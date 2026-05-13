import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { revalidateAdminCatalogue } from "@/lib/admin/revalidateAdminCatalogue";
import { BrandCatalogMode, BrandVisibilityStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { brandSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

const catalogModes = new Set<string>(Object.values(BrandCatalogMode));
const visibilityStatuses = new Set<string>(Object.values(BrandVisibilityStatus));

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;

    const id = (await params).id?.trim();
    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const brand = await prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        catalogMode: true,
        status: true,
        image: true,
        imageLight: true,
      }
    });

    if (!brand) return NextResponse.json({ error: "Marque introuvable" }, { status: 404 });
    return NextResponse.json({ brand });
  } catch (error) {
    console.error("[api/admin/brands/:id][GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const id = (await params).id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  let body: { name?: string; catalogMode?: string; image?: string | null; imageLight?: string | null; status?: string };
  try {
    body = (await request.json()) as {
      name?: string;
      catalogMode?: string;
      image?: string | null;
      imageLight?: string | null;
      status?: string;
    };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const data: {
    name?: string;
    slug?: string;
    catalogMode?: BrandCatalogMode;
    status?: BrandVisibilityStatus;
    image?: string | null;
    imageLight?: string | null;
  } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Nom de marque invalide." }, { status: 400 });
    }
    data.name = name;
    data.slug = brandSlug(name);
  }
  if (body.catalogMode !== undefined) {
    const mode = body.catalogMode.trim();
    if (!catalogModes.has(mode)) {
      return NextResponse.json({ error: "Mode catalogue invalide." }, { status: 400 });
    }
    data.catalogMode = mode as BrandCatalogMode;
  }
  if (body.status !== undefined) {
    const status = body.status.trim();
    if (!visibilityStatuses.has(status)) {
      return NextResponse.json({ error: "Statut de visibilité invalide." }, { status: 400 });
    }
    data.status = status as BrandVisibilityStatus;
  }
  if (body.image !== undefined) {
    data.image = body.image?.trim() || null;
  }

  // Règle de sécurité : Pas d'image + Gamme Complète = Statut masqué automatique
  const existing = await prisma.brand.findUnique({
    where: { id },
    select: { image: true, status: true, catalogMode: true },
  });
  
  const finalImage = data.image !== undefined ? data.image : existing?.image;
  const finalMode = data.catalogMode !== undefined ? data.catalogMode : existing?.catalogMode;

  if (finalMode === "COMPLETE" && (!finalImage || finalImage.trim() === "")) {
    data.status = "DRAFT";
  }

  if (body.imageLight !== undefined) {
    data.imageLight = body.imageLight?.trim() || null;
  }

  if ((data.catalogMode === "COMPLETE" || (!data.catalogMode && existing?.catalogMode === "COMPLETE")) && !finalImage) {
    return NextResponse.json(
      { error: "Image obligatoire en gamme complète." },
      { status: 400 },
    );
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const brand = await prisma.brand.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        catalogMode: true,
        status: true,
        image: true,
        imageLight: true,
        _count: { select: { perfumes: true } },
      },
    });
    if (data.catalogMode === "COMPLETE" || data.status === "DRAFT") {
      await prisma.perfume.updateMany({
        where: { brandId: id },
        data: { status: "DRAFT" },
      });
    }
    revalidatePath("/");
    revalidatePath("/marque");
    revalidateAdminCatalogue();
    await writeAudit(ctx.sub, "brand.update", "Brand", brand.id, data);
    return NextResponse.json({ brand });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Nom de marque déjà utilisé." }, { status: 409 });
      }
    }
    console.error("[api/admin/brands/:id][PATCH]", error);
    return NextResponse.json({ error: "Mise à jour impossible pour le moment." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const id = (await params).id?.trim();
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    const deleted = await prisma.brand.delete({
      where: { id },
      select: { id: true, name: true },
    });

    revalidatePath("/");
    revalidatePath("/marque");
    revalidateAdminCatalogue();
    await writeAudit(ctx.sub, "brand.hard_delete", "Brand", deleted.id, { name: deleted.name });
    return NextResponse.json({ ok: true, brand: deleted });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
    }
    console.error("[api/admin/brands/:id][DELETE]", error);
    return NextResponse.json({ error: "Suppression impossible pour le moment." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { BrandCatalogMode } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const catalogModes = new Set<string>(Object.values(BrandCatalogMode));

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteCtx) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const id = (await params).id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
  }

  let body: { name?: string; catalogMode?: string; image?: string | null };
  try {
    body = (await request.json()) as { name?: string; catalogMode?: string; image?: string | null };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const data: { name?: string; catalogMode?: BrandCatalogMode; image?: string | null } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "Nom de marque invalide." }, { status: 400 });
    }
    data.name = name;
  }
  if (body.catalogMode !== undefined) {
    const mode = body.catalogMode.trim();
    if (!catalogModes.has(mode)) {
      return NextResponse.json({ error: "Mode catalogue invalide." }, { status: 400 });
    }
    data.catalogMode = mode as BrandCatalogMode;
  }
  if (body.image !== undefined) {
    data.image = body.image?.trim() || null;
  }
  if (data.catalogMode === "COMPLETE" && !data.image) {
    const existing = await prisma.brand.findUnique({
      where: { id },
      select: { image: true, catalogMode: true },
    });
    const nextImage = data.image ?? existing?.image ?? null;
    if (!nextImage) {
      return NextResponse.json(
        { error: "Image obligatoire en gamme complète." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const brand = await prisma.brand.update({
      where: { id },
      data,
    });
    if (data.catalogMode === "COMPLETE") {
      await prisma.perfume.updateMany({
        where: { brandId: id },
        data: { status: "DRAFT" },
      });
    }
    revalidatePath("/");
    revalidatePath("/marque");
    await writeAudit(ctx.sub, "brand.update", "Brand", brand.id, data);
    return NextResponse.json({ brand });
  } catch {
    return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
  }
}

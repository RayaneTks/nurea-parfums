import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma, PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { perfumeSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

function isPublicationStatus(s: string): s is PublicationStatus {
  return Object.values(PublicationStatus).includes(s as PublicationStatus);
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;

    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "ID invalide." }, { status: 400 });
    }

    const perfume = await prisma.perfume.findUnique({
      where: { id },
      include: {
        brand: true,
      },
    });
    if (!perfume) {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }
    return NextResponse.json({ perfume });
  } catch (error) {
    console.error("[api/admin/perfumes/:id][GET]", error);
    return NextResponse.json(
      { error: "Impossible de charger ce parfum pour le moment." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const existing = await prisma.perfume.findUnique({
    where: { id },
    include: { brand: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
  }

  let body: {
    brandId?: string;
    name?: string;
    image?: string;
    imageLight?: string | null;
    status?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const brandId = (body.brandId ?? existing.brandId).trim();
  const name = (body.name ?? existing.name).trim();
  const image = (body.image ?? existing.image).trim();

  if (!brandId || !name || !image) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
  }
  const status =
    body.status !== undefined && isPublicationStatus(body.status)
      ? body.status
      : existing.status;
  if (status === "PUBLISHED" && brand.catalogMode === "COMPLETE") {
    return NextResponse.json(
      {
        error:
          "Impossible de rendre visible ce parfum: sa marque est en gamme complète.",
      },
      { status: 400 },
    );
  }
  if (status === "PUBLISHED" && brand.status === "DRAFT") {
    return NextResponse.json(
      {
        error:
          "Impossible de rendre visible ce parfum: sa marque est masquée.",
      },
      { status: 400 },
    );
  }

  const slug = perfumeSlug(id, name, brand.name);

    const perfume = await prisma.perfume.update({
      where: { id },
      data: {
        brandId,
        name,
        slug,
        image,
        imageLight:
          body.imageLight === undefined ? existing.imageLight : body.imageLight?.trim() || null,
        status,
      },
      include: {
        brand: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/marque");
    await writeAudit(ctx.sub, "perfume.update", "Perfume", String(id), { name });
    return NextResponse.json({ perfume });
  } catch (error) {
    console.error("[api/admin/perfumes/:id][PUT]", error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour ce parfum pour le moment." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  let body: { status?: string; isFeatured?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

    const updates: Prisma.PerfumeUpdateInput = {};
    if (body.status && isPublicationStatus(body.status)) {
      const perfumeWithBrand = await prisma.perfume.findUnique({
        where: { id },
        include: { brand: { select: { catalogMode: true, status: true } } },
      });
      if (!perfumeWithBrand) {
        return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
      }
      if (body.status === "PUBLISHED" && perfumeWithBrand.brand.catalogMode === "COMPLETE") {
        return NextResponse.json(
          { error: "Impossible de rendre visible ce parfum: sa marque est en gamme complète." },
          { status: 400 },
        );
      }
      if (body.status === "PUBLISHED" && perfumeWithBrand.brand.status === "DRAFT") {
        return NextResponse.json(
          { error: "Impossible de rendre visible ce parfum: sa marque est masquée." },
          { status: 400 },
        );
      }
      updates.status = body.status;
    }

    if (body.isFeatured !== undefined) {
       // if we are setting to true, we must ensure max 2 are featured.
       if (body.isFeatured === true) {
          const featuredCount = await prisma.perfume.count({ where: { isFeatured: true } });
          if (featuredCount >= 2) {
             return NextResponse.json({ error: "Maximum de 2 parfums mis en avant atteint." }, { status: 400 });
          }
       }
       updates.isFeatured = body.isFeatured;
    }

    if (Object.keys(updates).length > 0) {
      const perfume = await prisma.perfume.update({
        where: { id },
        data: updates,
      });
      revalidatePath("/");
      revalidatePath("/marque");
      await writeAudit(ctx.sub, "perfume.patch", "Perfume", String(id), updates);
      return NextResponse.json({ perfume });
    }

    return NextResponse.json({ error: "Aucun champ valide." }, { status: 400 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }
    console.error("[api/admin/perfumes/:id][PATCH]", error);
    return NextResponse.json(
      { error: "Impossible de changer le statut pour le moment." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

    const deleted = await prisma.perfume.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/marque");
    await writeAudit(ctx.sub, "perfume.hard_delete", "Perfume", String(id), { name: deleted.name });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }
    console.error("[api/admin/perfumes/:id][DELETE]", error);
    return NextResponse.json(
      { error: "Impossible de supprimer ce parfum pour le moment." },
      { status: 500 },
    );
  }
}

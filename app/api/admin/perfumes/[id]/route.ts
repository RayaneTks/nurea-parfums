import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PublicationStatus } from "@prisma/client";
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
}

export async function PUT(request: Request, { params }: RouteCtx) {
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
  if (brand.catalogMode === "COMPLETE") {
    return NextResponse.json(
      {
        error:
          "Cette marque est en gamme complète. Passez-la en mode sélection pour modifier un parfum individuel.",
      },
      { status: 400 },
    );
  }

  const status =
    body.status !== undefined && isPublicationStatus(body.status)
      ? body.status
      : existing.status;

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
}

export async function PATCH(request: Request, { params }: RouteCtx) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const existing = await prisma.perfume.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (body.status && isPublicationStatus(body.status)) {
    const perfume = await prisma.perfume.update({
      where: { id },
      data: { status: body.status },
    });
    revalidatePath("/");
    revalidatePath("/marque");
    await writeAudit(ctx.sub, "perfume.toggle_visibility", "Perfume", String(id), { status: body.status });
    return NextResponse.json({ perfume });
  }

  return NextResponse.json({ error: "Aucun champ valide." }, { status: 400 });
}

export async function DELETE(request: Request, { params }: RouteCtx) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 });
  }

  const existing = await prisma.perfume.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
  }

  await prisma.perfume.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/marque");
  await writeAudit(ctx.sub, "perfume.hard_delete", "Perfume", String(id), { name: existing.name });
  return NextResponse.json({ ok: true });
}

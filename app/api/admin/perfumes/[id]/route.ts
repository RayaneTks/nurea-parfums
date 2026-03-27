import { NextResponse } from "next/server";
import { PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { categories, normalizeForFuzzy } from "@/lib/data";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { perfumeSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

const dbCategories = categories.filter((c) => c !== "Tout voir");

function isDbCategory(s: string): s is (typeof dbCategories)[number] {
  return (dbCategories as readonly string[]).includes(s);
}

function parseLines(s: string | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

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
      aliases: true,
      tags: true,
      classics: true,
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
    category?: string;
    image?: string;
    imageLight?: string | null;
    imageDark?: string | null;
    status?: string;
    aliases?: string;
    tags?: string;
    classics?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const brandId = (body.brandId ?? existing.brandId).trim();
  const name = (body.name ?? existing.name).trim();
  const category = (body.category ?? existing.category).trim();
  const image = (body.image ?? existing.image).trim();

  if (!brandId || !name || !category || !image) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }
  if (!isDbCategory(category)) {
    return NextResponse.json({ error: `Categorie invalide : ${category}` }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
  }

  const isRangeBrand = brand.assortment === "COMPLETE";
  const finalName = isRangeBrand ? brand.name : name;
  const finalCategory = isRangeBrand ? "Gammes Complètes" : category;

  const status =
    body.status !== undefined && isPublicationStatus(body.status)
      ? body.status
      : existing.status;

  const slug = perfumeSlug(id, finalName, brand.name);

  const aliases = parseLines(body.aliases);
  const tags = parseLines(body.tags);
  const classics = parseLines(body.classics);

  const perfume = await prisma.$transaction(async (tx) => {
    await tx.perfumeAlias.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeTag.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeClassic.deleteMany({ where: { perfumeId: id } });

    return tx.perfume.update({
      where: { id },
      data: {
        brandId,
        name: finalName,
        slug,
        category: finalCategory,
        image,
        imageLight: body.imageLight === undefined ? existing.imageLight : body.imageLight?.trim() || null,
        imageDark: null,
        status,
        deletedAt: null,
        ...(aliases.length
          ? {
              aliases: {
                create: aliases.map((alias) => ({
                  alias,
                  normalized: normalizeForFuzzy(alias),
                })),
              },
            }
          : {}),
        ...(tags.length ? { tags: { create: tags.map((tag) => ({ tag })) } } : {}),
        ...(classics.length
          ? { classics: { create: classics.map((line) => ({ line })) } }
          : {}),
      },
      include: {
        brand: true,
        aliases: true,
        tags: true,
        classics: true,
      },
    });
  });

  if (isRangeBrand) {
    await prisma.perfume.updateMany({
      where: { brandId, id: { not: id } },
      data: { status: "DRAFT", deletedAt: null },
    });
  }

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
      data: { status: body.status, deletedAt: null },
    });
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

  await prisma.$transaction(async (tx) => {
    await tx.perfumeAlias.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeTag.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeClassic.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeSize.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeImage.deleteMany({ where: { perfumeId: id } });
    await tx.perfumeNote.deleteMany({ where: { perfumeId: id } });
    await tx.perfume.delete({ where: { id } });
  });

  await writeAudit(ctx.sub, "perfume.hard_delete", "Perfume", String(id), { name: existing.name });
  return NextResponse.json({ ok: true });
}

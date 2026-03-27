import { NextResponse } from "next/server";
import { PublicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { categories } from "@/lib/data";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { normalizeForFuzzy } from "@/lib/data";
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

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "1";
  const statusParam = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (!includeDeleted) {
    where.deletedAt = null;
  }
  if (statusParam && Object.values(PublicationStatus).includes(statusParam as PublicationStatus)) {
    where.status = statusParam as PublicationStatus;
  }

  const perfumes = await prisma.perfume.findMany({
    where,
    include: {
      brand: { select: { id: true, name: true } },
      aliases: true,
      tags: true,
      classics: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ perfumes });
}

export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  let body: {
    brandId?: string;
    name?: string;
    category?: string;
    image?: string;
    imageLight?: string | null;
    imageDark?: string | null;
    status?: PublicationStatus;
    aliases?: string;
    tags?: string;
    classics?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const brandId = (body.brandId ?? "").trim();
  const name = (body.name ?? "").trim();
  const category = (body.category ?? "").trim();
  const image = (body.image ?? "").trim();

  if (!brandId || !name || !category || !image) {
    return NextResponse.json(
      { error: "brandId, name, category et image sont requis." },
      { status: 400 }
    );
  }
  if (!isDbCategory(category)) {
    return NextResponse.json({ error: `Catégorie invalide : ${category}` }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) {
    return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
  }

  const isRangeBrand = brand.assortment === "COMPLETE";
  const finalName = isRangeBrand ? brand.name : name;
  const finalCategory = isRangeBrand ? "Gammes Complètes" : category;

  const maxRow = await prisma.perfume.aggregate({ _max: { id: true } });
  const nextId = (maxRow._max.id ?? 0) + 1;
  const slug = perfumeSlug(nextId, finalName, brand.name);
  const status =
    body.status && Object.values(PublicationStatus).includes(body.status) ? body.status : "DRAFT";

  const aliases = parseLines(body.aliases);
  const tags = parseLines(body.tags);
  const classics = parseLines(body.classics);

  const perfume = await prisma.perfume.create({
    data: {
      id: nextId,
      brandId,
      name: finalName,
      slug,
      category: finalCategory,
      image,
      imageLight: body.imageLight?.trim() || null,
      imageDark: null,
      status,
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

  if (isRangeBrand) {
    await prisma.perfume.updateMany({
      where: { brandId, id: { not: perfume.id } },
      data: { status: "DRAFT", deletedAt: null },
    });
  }

  await writeAudit(ctx.sub, "perfume.create", "Perfume", String(perfume.id), { name: finalName });
  return NextResponse.json({ perfume });
}

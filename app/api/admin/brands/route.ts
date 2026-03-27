import { NextResponse } from "next/server";
import { BrandAssortment, BrandPositioning } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { brandSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

const assortments = new Set<string>(Object.values(BrandAssortment));
const positionings = new Set<string>(Object.values(BrandPositioning));

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      assortment: true,
      positioning: true,
      _count: { select: { perfumes: true } },
    },
  });
  return NextResponse.json({ brands });
}

export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  let body: { name?: string; assortment?: string; positioning?: string };
  try {
    body = (await request.json()) as { name?: string; assortment?: string; positioning?: string };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Nom de marque invalide (2–120 car.)." }, { status: 400 });
  }

  const data: { name: string; slug: string; assortment?: BrandAssortment; positioning?: BrandPositioning } = {
    name,
    slug: brandSlug(name),
  };

  if (body.assortment && assortments.has(body.assortment)) {
    data.assortment = body.assortment as BrandAssortment;
  }
  if (body.positioning && positionings.has(body.positioning)) {
    data.positioning = body.positioning as BrandPositioning;
  }

  try {
    const brand = await prisma.brand.create({ data });
    await writeAudit(ctx.sub, "brand.create", "Brand", brand.id);
    return NextResponse.json({ brand });
  } catch {
    return NextResponse.json({ error: "Marque déjà existante ou slug en conflit." }, { status: 409 });
  }
}

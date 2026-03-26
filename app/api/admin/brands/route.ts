import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { brandSlug } from "@/lib/slugify";

export const dynamic = "force-dynamic";

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

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: "Nom de marque invalide (2–120 car.)." }, { status: 400 });
  }

  const slug = brandSlug(name);
  try {
    const brand = await prisma.brand.create({
      data: { name, slug },
    });
    await writeAudit(ctx.sub, "brand.create", "Brand", brand.id);
    return NextResponse.json({ brand });
  } catch {
    return NextResponse.json({ error: "Marque déjà existante ou slug en conflit." }, { status: 409 });
  }
}

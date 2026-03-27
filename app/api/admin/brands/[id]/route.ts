import { NextResponse } from "next/server";
import { BrandAssortment, BrandPositioning } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const assortments = new Set<string>(Object.values(BrandAssortment));
const positionings = new Set<string>(Object.values(BrandPositioning));

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

  let body: { assortment?: string; positioning?: string };
  try {
    body = (await request.json()) as { assortment?: string; positioning?: string };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const data: { assortment?: BrandAssortment; positioning?: BrandPositioning } = {};
  if (body.assortment !== undefined) {
    if (!assortments.has(body.assortment)) {
      return NextResponse.json({ error: "Assortiment invalide." }, { status: 400 });
    }
    data.assortment = body.assortment as BrandAssortment;
  }
  if (body.positioning !== undefined) {
    if (!positionings.has(body.positioning)) {
      return NextResponse.json({ error: "Univers invalide." }, { status: 400 });
    }
    data.positioning = body.positioning as BrandPositioning;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  try {
    const brand = await prisma.brand.update({
      where: { id },
      data,
    });
    if (data.assortment === "COMPLETE") {
      await prisma.perfume.updateMany({
        where: { brandId: id },
        data: { status: "DRAFT", deletedAt: null },
      });
    }
    await writeAudit(ctx.sub, "brand.update", "Brand", brand.id, data);
    return NextResponse.json({ brand });
  } catch {
    return NextResponse.json({ error: "Marque introuvable." }, { status: 404 });
  }
}

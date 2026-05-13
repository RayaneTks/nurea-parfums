import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { computeOrderBalance } from "@/server/orders/payments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const balance = await computeOrderBalance(id);
  if (!balance) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  return NextResponse.json({ balance });
}

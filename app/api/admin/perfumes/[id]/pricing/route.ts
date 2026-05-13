import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { listPricingsForPerfume, lookupPricing } from "@/server/pricing/queries";
import { upsertPerfumePricingAction, deletePerfumePricingAction } from "@/server/pricing/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const { id } = await params;
  const perfumeId = Number(id);
  if (!Number.isInteger(perfumeId) || perfumeId <= 0) {
    return NextResponse.json({ error: "perfumeId invalide." }, { status: 400 });
  }

  const url = new URL(request.url);
  const volumeParam = url.searchParams.get("volumeMl");
  if (volumeParam) {
    const v = Number(volumeParam);
    const row = await lookupPricing(perfumeId, v);
    return NextResponse.json({ row });
  }

  const rows = await listPricingsForPerfume(perfumeId);
  return NextResponse.json({ rows });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const { id } = await params;
  const perfumeId = Number(id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const merged =
    typeof body === "object" && body !== null
      ? { ...(body as Record<string, unknown>), perfumeId }
      : { perfumeId };

  const result = await upsertPerfumePricingAction(merged);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ pricing: result.data });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const { id } = await params;
  const perfumeId = Number(id);
  const url = new URL(request.url);
  const volumeMl = Number(url.searchParams.get("volumeMl"));
  if (!Number.isInteger(volumeMl) || volumeMl <= 0) {
    return NextResponse.json({ error: "volumeMl invalide (?volumeMl=...)." }, { status: 400 });
  }

  const result = await deletePerfumePricingAction(perfumeId, volumeMl);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

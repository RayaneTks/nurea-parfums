import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { listPaymentsForOrder } from "@/server/orders/payments";
import { recordPaymentAction } from "@/server/orders/paymentActions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const rows = await listPaymentsForOrder(id);
  return NextResponse.json({ rows });
}

export async function POST(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const merged =
    typeof body === "object" && body !== null
      ? { ...(body as Record<string, unknown>), orderId: id }
      : { orderId: id };

  const result = await recordPaymentAction(merged);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ payment: result.data }, { status: 201 });
}

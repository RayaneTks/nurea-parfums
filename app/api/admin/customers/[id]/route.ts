import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { getCustomerById } from "@/server/customers/queries";
import { deleteCustomerAction, updateCustomerAction } from "@/server/customers/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  return NextResponse.json({ customer });
}

export async function PATCH(request: Request, { params }: Params) {
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
  const result = await updateCustomerAction(id, body as Parameters<typeof updateCustomerAction>[1]);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ customer: result.data });
}

export async function DELETE(request: Request, { params }: Params) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  const { id } = await params;
  const result = await deleteCustomerAction(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

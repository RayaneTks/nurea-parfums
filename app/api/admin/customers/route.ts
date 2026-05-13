import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { listCustomers } from "@/server/customers/queries";
import { createCustomerAction } from "@/server/customers/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");

  const result = await listCustomers({ q, cursor, limit });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const result = await createCustomerAction(body as Parameters<typeof createCustomerAction>[0]);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ customer: result.data }, { status: 201 });
}

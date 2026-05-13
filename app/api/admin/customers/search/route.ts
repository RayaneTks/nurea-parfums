import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { searchCustomers } from "@/server/customers/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Number(url.searchParams.get("limit") ?? "10");

  if (q.length === 0) return NextResponse.json({ rows: [] });

  const rows = await searchCustomers(q, limit);
  return NextResponse.json({ rows });
}

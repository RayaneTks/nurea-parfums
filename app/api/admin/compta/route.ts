import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { listSalesGroupedByCustomer } from "@/server/sales/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const data = await listSalesGroupedByCustomer({ q });
  return NextResponse.json(data);
}

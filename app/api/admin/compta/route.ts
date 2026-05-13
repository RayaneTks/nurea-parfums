import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { listSalesGroupedByCustomer, type Period } from "@/server/sales/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parsePeriod(raw: string | null): Period {
  if (raw === "week" || raw === "all") return raw;
  return "month";
}

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const q = (url.searchParams.get("q") ?? "").trim();
  const data = await listSalesGroupedByCustomer({ period, q });
  return NextResponse.json(data);
}

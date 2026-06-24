import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { globalSearch } from "@/server/search/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;

    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const result = await globalSearch(q);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/search][GET]", error);
    return jsonFromPrismaGestionError(error, "Recherche indisponible.");
  }
}

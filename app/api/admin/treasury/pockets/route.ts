import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { listPockets } from "@/server/treasury/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const pockets = await listPockets();
    return NextResponse.json({ pockets });
  } catch (error) {
    console.error("[api/admin/treasury/pockets][GET]", error);
    return jsonFromPrismaGestionError(error, "Poches indisponibles.");
  }
}

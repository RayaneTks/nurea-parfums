import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json({
    ok: true,
    user: { username: ctx.username, role: ctx.role },
  });
}

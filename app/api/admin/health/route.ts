import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Vérifie que le secret admin est configuré (futur garde pour routes /api/admin/*).
 */
export async function GET(request: Request) {
  const secret = process.env.ADMIN_DASHBOARD_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_DASHBOARD_SECRET non configuré." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    database: process.env.DATABASE_URL ? "configured" : "mock_catalog",
  });
}

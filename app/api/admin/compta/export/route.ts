import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Échappe un champ CSV (guillemets + séparateur). */
function csv(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function periodStart(period: string | null): Date | null {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

/** Export CSV des ventes (pour le comptable). */
export async function GET(request: Request) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;

    const url = new URL(request.url);
    const since = periodStart(url.searchParams.get("period"));

    const sales = await prisma.sale.findMany({
      where: since ? { soldAt: { gte: since } } : undefined,
      orderBy: { soldAt: "desc" },
      select: {
        soldAt: true,
        customerName: true,
        totalRevenue: true,
        totalCost: true,
        totalMargin: true,
        remainingDue: true,
        batch: { select: { name: true } },
        customer: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    });

    const headers = [
      "Date",
      "Client",
      "Articles",
      "CA (€)",
      "Coût (€)",
      "Marge (€)",
      "Reste dû (€)",
      "Lot",
    ];
    const rows = sales.map((s) =>
      [
        csv(s.soldAt.toISOString().slice(0, 10)),
        csv(s.customer?.fullName ?? s.customerName ?? "Anonyme"),
        csv(s._count.items),
        csv(s.totalRevenue.toString()),
        csv(s.totalCost.toString()),
        csv(s.totalMargin.toString()),
        csv(s.remainingDue.toString()),
        csv(s.batch?.name ?? ""),
      ].join(";"),
    );
    // BOM pour Excel (accents) + séparateur ';'.
    const body = "﻿" + [headers.join(";"), ...rows].join("\r\n");
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compta-ventes-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("[api/admin/compta/export][GET]", error);
    return jsonFromPrismaGestionError(error, "Export impossible.");
  }
}

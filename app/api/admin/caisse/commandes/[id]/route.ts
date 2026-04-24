import { NextResponse } from "next/server";
import { CustomerOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const denied = requireEditor(auth);
    if (denied) return denied;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    let body: { status?: string; note?: string | null; details?: string; customerName?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    const data: {
      status?: CustomerOrderStatus;
      note?: string | null;
      details?: string;
      customerName?: string;
    } = {};

    if (body.status !== undefined) {
      if (!Object.values(CustomerOrderStatus).includes(body.status as CustomerOrderStatus)) {
        return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
      }
      data.status = body.status as CustomerOrderStatus;
    }
    if (body.note !== undefined) {
      if (body.note === null) {
        data.note = null;
      } else if (typeof body.note === "string") {
        const trimmed = body.note.trim().slice(0, 2000);
        data.note = trimmed.length > 0 ? trimmed : null;
      }
    }
    if (body.details !== undefined) {
      const d = (body.details ?? "").trim();
      if (!d) return NextResponse.json({ error: "Le détail ne peut pas être vide." }, { status: 400 });
      data.details = d.slice(0, 8000);
    }
    if (body.customerName !== undefined) {
      const n = (body.customerName ?? "").trim();
      if (!n) return NextResponse.json({ error: "Le nom ne peut pas être vide." }, { status: 400 });
      data.customerName = n.slice(0, 200);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
    }

    const order = await prisma.customerOrder.update({
      where: { id },
      data,
      select: {
        id: true,
        customerName: true,
        details: true,
        status: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await writeAudit(auth.sub, "customer_order.patch", "CustomerOrder", id, { fields: Object.keys(data) });

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_COMMANDE_PATCH]", error);
    return NextResponse.json({ error: "Impossible de mettre à jour la commande." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;
    const denied = requireEditor(auth);
    if (denied) return denied;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant." }, { status: 400 });
    }

    await prisma.customerOrder.delete({ where: { id } });
    await writeAudit(auth.sub, "customer_order.delete", "CustomerOrder", id, {});

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2025") {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    if (code === "P2022") {
      return NextResponse.json(
        { error: "Schéma de base de données non synchronisé. Exécutez la migration Prisma." },
        { status: 500 },
      );
    }
    console.error("[CAISSE_COMMANDE_DELETE]", error);
    return NextResponse.json({ error: "Impossible de supprimer la commande." }, { status: 500 });
  }
}

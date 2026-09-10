import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { writeAudit } from "@/lib/admin/audit";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import { removeObjects } from "@/lib/supabase/adminStorage";
import { removePerfumeMedia } from "@/server/catalogue/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id, mediaId } = await params;
    const perfumeId = Number(id);
    if (!Number.isInteger(perfumeId) || perfumeId <= 0) {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }

    const path = await removePerfumeMedia(perfumeId, mediaId);
    if (path === null) {
      return NextResponse.json({ error: "Visuel introuvable." }, { status: 404 });
    }

    /*
     * L'objet part du bucket avec la ligne. Sans ça, chaque visuel retiré
     * laisserait un fichier que plus rien ne référence — invisible, facturé,
     * et impossible à retrouver plus tard faute de trace de son parfum.
     * `removeObjects` avale ses erreurs : la ligne, elle, est déjà supprimée.
     */
    await removeObjects([path]);

    await writeAudit(ctx.sub, "perfume.media.delete", "Perfume", String(perfumeId), {
      mediaId,
      path,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/perfumes/[id]/media/[mediaId]][DELETE]", error);
    return jsonFromPrismaGestionError(error, "Impossible de supprimer le visuel.");
  }
}

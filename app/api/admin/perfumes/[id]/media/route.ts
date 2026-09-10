import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import { writeAudit } from "@/lib/admin/audit";
import { jsonFromPrismaGestionError } from "@/lib/gestion/prismaGestionError";
import {
  addPerfumeMedia,
  listPerfumeMedia,
  reorderPerfumeMedia,
} from "@/server/catalogue/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Garde-fou : un parfum ne porte pas une pellicule entière. */
const MAX_MEDIA_PER_PERFUME = 24;

function parsePerfumeId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const perfumeId = parsePerfumeId(id);
    if (perfumeId === null) {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }

    return NextResponse.json({ media: await listPerfumeMedia(perfumeId) });
  } catch (error) {
    console.error("[api/admin/perfumes/[id]/media][GET]", error);
    return jsonFromPrismaGestionError(error, "Impossible de charger les visuels.");
  }
}

type PostBody = {
  url?: string;
  path?: string;
  label?: string | null;
  width?: number;
  height?: number;
  bytes?: number;
  /** Alternative au dépôt d'un visuel : réordonner ceux qui existent. */
  order?: string[];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAdmin(request);
    if (ctx instanceof NextResponse) return ctx;
    const denied = requireEditor(ctx);
    if (denied) return denied;

    const { id } = await params;
    const perfumeId = parsePerfumeId(id);
    if (perfumeId === null) {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }

    let body: PostBody;
    try {
      body = (await request.json()) as PostBody;
    } catch {
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    }

    if (Array.isArray(body.order)) {
      await reorderPerfumeMedia(perfumeId, body.order);
      await writeAudit(ctx.sub, "perfume.media.reorder", "Perfume", String(perfumeId), {
        count: body.order.length,
      });
      return NextResponse.json({ media: await listPerfumeMedia(perfumeId) });
    }

    const exists = await prisma.perfume.findUnique({
      where: { id: perfumeId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Parfum introuvable." }, { status: 404 });
    }

    const { url, path, width, height, bytes } = body;
    if (!url || !path) {
      return NextResponse.json({ error: "Visuel incomplet." }, { status: 400 });
    }
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      !Number.isInteger(bytes) ||
      (width as number) <= 0 ||
      (height as number) <= 0 ||
      (bytes as number) <= 0
    ) {
      return NextResponse.json({ error: "Dimensions du visuel invalides." }, { status: 400 });
    }

    const count = await prisma.perfumeMedia.count({ where: { perfumeId } });
    if (count >= MAX_MEDIA_PER_PERFUME) {
      return NextResponse.json(
        {
          error: `Maximum ${MAX_MEDIA_PER_PERFUME} visuels par parfum. Supprime-en un avant d'en ajouter.`,
        },
        { status: 409 },
      );
    }

    const media = await addPerfumeMedia(perfumeId, {
      url,
      path,
      label: body.label ?? null,
      width: width as number,
      height: height as number,
      bytes: bytes as number,
    });

    await writeAudit(ctx.sub, "perfume.media.add", "Perfume", String(perfumeId), {
      mediaId: media.id,
      path: media.path,
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("[api/admin/perfumes/[id]/media][POST]", error);
    return jsonFromPrismaGestionError(error, "Impossible d'ajouter le visuel.");
  }
}

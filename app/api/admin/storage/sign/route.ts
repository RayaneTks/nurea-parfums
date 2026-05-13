import { NextResponse } from "next/server";
import { requireAdmin, requireEditor } from "@/lib/admin/requireAdmin";
import {
  publicObjectUrl,
  safeImagePath,
  storageBucketName,
  supabaseAdmin,
} from "@/lib/supabase/adminStorage";

export const dynamic = "force-dynamic";

/**
 * Retourne une URL signée + token pour upload direct navigateur → Supabase Storage.
 */
export async function POST(request: Request) {
  const ctx = await requireAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  const denied = requireEditor(ctx);
  if (denied) return denied;

  let body: { filename?: string };
  try {
    body = (await request.json()) as { filename?: string };
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  let path: string;
  try {
    path = safeImagePath(body.filename ?? "upload.jpg");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Nom de fichier invalide." },
      { status: 400 }
    );
  }

  try {
    const supabase = supabaseAdmin();
    const bucket = storageBucketName();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: true,
    });
    if (error || !data) {
      console.error("[storage/sign]", error);
      return NextResponse.json(
        { error: error?.message ?? "Impossible de créer l’URL d’upload." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicObjectUrl(data.path),
    });
  } catch (e) {
    console.error("[storage/sign]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage non configuré." },
      { status: 503 }
    );
  }
}

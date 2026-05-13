import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "catalog";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function storageBucketName(): string {
  return BUCKET;
}

/**
 * URL publique d’un objet (bucket public « catalog »).
 */
export function publicObjectUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant.");
  const clean = path.replace(/^\/+/, "");
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${clean}`;
}

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function safeImagePath(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() ?? "image";
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Format non autorisé (jpg, png, webp, gif).");
  }
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return `perfumes/${stamp}.${ext}`;
}

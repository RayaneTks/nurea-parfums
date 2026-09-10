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

/*
 * HEIC et HEIF sont acceptés : c'est le format par défaut de l'appareil photo
 * d'un iPhone, et refuser « Format non autorisé » à une photo qu'on vient de
 * prendre était incompréhensible pour qui la voyait s'afficher partout
 * ailleurs. Le navigateur la reconvertit en WebP avant l'envoi ; l'extension
 * reste tolérée pour le cas où la conversion échoue.
 */
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif"]);

/**
 * Chemin d'un objet dans le bucket.
 *
 * Le nom d'origine est intégralement jeté — seule l'extension survit. C'est
 * volontaire : il pourrait contenir n'importe quoi, et le chemin qu'on
 * fabrique est aléatoire, donc sans collision possible.
 *
 * `scope` range les objets par usage plutôt que dans un unique dossier plat où
 * les logos de marques, les visuels de catalogue et les planches story se
 * mélangeaient sans qu'aucun ne puisse être rattaché à sa fiche.
 */
export function safeImagePath(
  originalName: string,
  scope: { kind: "catalog" | "story"; ownerId?: string | number } = { kind: "catalog" },
): string {
  const base = originalName.split(/[/\\]/).pop() ?? "image";
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Format non autorisé (jpg, png, webp, gif, heic).");
  }
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  if (scope.kind === "story") {
    const owner = String(scope.ownerId ?? "divers").replace(/[^a-zA-Z0-9_-]/g, "");
    return `stories/${owner || "divers"}/${stamp}.${ext}`;
  }
  return `perfumes/${stamp}.${ext}`;
}

/**
 * Supprime des objets du bucket.
 *
 * Rien n'effaçait jamais rien : chaque remplacement d'image laissait
 * l'ancienne derrière lui, indéfiniment. Retirer un visuel doit retirer le
 * fichier, sinon le stockage ne fait que croître avec des objets que plus
 * aucune ligne ne référence.
 *
 * L'échec n'est pas propagé : une ligne supprimée en base avec un objet resté
 * dans le bucket est un désagrément ; une suppression refusée à l'utilisateur
 * parce que le stockage bougonne est un blocage.
 */
export async function removeObjects(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const supabase = supabaseAdmin();
    await supabase.storage.from(BUCKET).remove([...paths]);
  } catch (e) {
    console.error("[storage/remove]", e);
  }
}

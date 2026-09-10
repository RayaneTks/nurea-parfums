/**
 * Optimisation client-side avant upload :
 * - Conversion WebP
 * - Recadrage forcé 1024x1536 (portrait standard Nuréa)
 * - Compression maîtrisée (0.80)
 * - Génération d'un mini placeholder blur local (facultatif mais utile)
 */

export async function convertToWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const targetW = 1024;
  const targetH = 1536;

  // Calcul du cropping (Cover effect)
  let sw, sh, sx, sy;
  const bitmapRatio = bitmap.width / bitmap.height;
  const targetRatio = targetW / targetH;

  if (bitmapRatio > targetRatio) {
    // Trop large
    sh = bitmap.height;
    sw = sh * targetRatio;
    sx = (bitmap.width - sw) / 2;
    sy = 0;
  } else {
    // Trop haut ou pile poil
    sw = bitmap.width;
    sh = sw / targetRatio;
    sx = 0;
    sy = (bitmap.height - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Qualité de rendu
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);
  
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.95), // Augmentation de la qualité pour le luxe
  );
  bitmap.close();

  if (!blob) return file;
  const safeName = file.name.replace(/\.[a-zA-Z0-9]+$/, "");
  return new File([blob], `${safeName}.webp`, { type: "image/webp" });
}

/** 
 * Génère un tout petit placeholder (ex: 20px) pour le champ blurDataURL si besoin,
 * ou pour un usage immédiat en UI.
 */
export async function generateBlurDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 20;
  canvas.height = 30;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/webp", 0.3);
  bitmap.close();
  return dataUrl;
}

export async function uploadFile(file: File): Promise<string> {
  const prepared = await convertToWebp(file);

  const sign = await fetch("/api/admin/storage/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: prepared.name }),
  });

  type SignResponse = {
    error?: string;
    token?: string;
    signedUrl?: string;
    publicUrl?: string;
  };
  const j = (await sign.json()) as SignResponse;
  if (!sign.ok) throw new Error(j.error ?? "Signature refusée");

  const headers: Record<string, string> = {
    "Content-Type": prepared.type || "application/octet-stream",
  };
  if (j.token) headers.Authorization = `Bearer ${j.token}`;

  if (!j.signedUrl) throw new Error("URL signée manquante.");
  const put = await fetch(j.signedUrl, {
    method: "PUT",
    body: prepared,
    headers,
  });

  if (!put.ok) throw new Error(`Upload refusé (${put.status})`);
  return j.publicUrl ?? "";
}


/* ─── Visuels marketing (planches story) ────────────────────────────────── */

/** Ce qu'on sait d'un visuel une fois préparé : le fichier, et ses dimensions. */
export type PreparedImage = { file: File; width: number; height: number };

/** Au-delà, on redimensionne. En deçà, on ne touche à rien. */
const STORY_MAX_EDGE = 1920;
/** Un visuel plus lourd est refusé avant le premier octet envoyé. */
export const STORY_MAX_BYTES = 12 * 1024 * 1024;

/**
 * Prépare un visuel marketing **sans jamais le recadrer**.
 *
 * `convertToWebp` impose un recadrage 2:3 en « cover » — juste pour les images
 * du catalogue, dont le format est fixé par la charte. Appliqué à une planche
 * story en 9:16, il en amputerait 300 pixels en haut et en bas : c'est-à-dire
 * exactement le nom du parfum et la ligne des notes de fond. Un visuel qu'on
 * publie tel quel ne se recadre pas ; on se contente de le ramener à une
 * définition raisonnable, en conservant ses proportions.
 *
 * La conversion en WebP sert aussi de garde-fou : elle transforme au passage
 * un HEIC d'iPhone en quelque chose que tous les navigateurs affichent.
 */
export async function prepareStoryImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error("Ce fichier n'est pas une image.");
  }
  if (file.size > STORY_MAX_BYTES) {
    throw new Error(
      `Visuel trop lourd (${Math.round(file.size / 1024 / 1024)} Mo). Maximum ${
        STORY_MAX_BYTES / 1024 / 1024
      } Mo.`,
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Image illisible par le navigateur. Essaie en JPEG ou PNG.");
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > STORY_MAX_EDGE ? STORY_MAX_EDGE / longest : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Préparation impossible sur cet appareil.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92),
  );
  if (!blob) throw new Error("Conversion impossible sur cet appareil.");

  const base = file.name.replace(/\.[a-zA-Z0-9]+$/, "") || "visuel";
  return {
    file: new File([blob], `${base}.webp`, { type: "image/webp" }),
    width,
    height,
  };
}

/**
 * Envoie un visuel préparé et rend de quoi l'enregistrer en base.
 *
 * `scope: "story"` range l'objet sous `stories/<parfum>/` : les visuels d'un
 * parfum se retrouvent alors dans le bucket sans avoir à interroger la base.
 */
export async function uploadStoryImage(
  perfumeId: number,
  prepared: PreparedImage,
): Promise<{ url: string; path: string; width: number; height: number; bytes: number }> {
  const sign = await fetch("/api/admin/storage/sign", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: prepared.file.name, scope: "story", perfumeId }),
  });

  type SignResponse = {
    error?: string;
    token?: string;
    signedUrl?: string;
    publicUrl?: string;
    path?: string;
  };
  // Une réponse non-JSON (502 d'un proxy, page HTML d'erreur) ne doit pas
  // ressortir en « Unexpected token < » : l'utilisateur n'y peut rien.
  const j = (await sign.json().catch(() => ({}))) as SignResponse;
  if (!sign.ok) throw new Error(j.error ?? "Envoi refusé par le serveur.");
  if (!j.signedUrl || !j.path || !j.publicUrl) {
    throw new Error("Réponse de signature incomplète.");
  }

  const headers: Record<string, string> = { "Content-Type": prepared.file.type };
  if (j.token) headers.Authorization = `Bearer ${j.token}`;

  const put = await fetch(j.signedUrl, { method: "PUT", body: prepared.file, headers });
  if (!put.ok) {
    throw new Error(
      put.status === 413 ? "Visuel trop lourd pour le stockage." : `Envoi refusé (${put.status}).`,
    );
  }

  return {
    url: j.publicUrl,
    path: j.path,
    width: prepared.width,
    height: prepared.height,
    bytes: prepared.file.size,
  };
}

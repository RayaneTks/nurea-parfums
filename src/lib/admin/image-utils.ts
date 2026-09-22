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

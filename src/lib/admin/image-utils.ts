/**
 * Optimisation client-side avant upload :
 * - Conversion WebP
 * - Recadrage forcé 1024x1536 (portrait standard Nuréa)
 * - Compression maîtrisée (voir `QUALITE_WEBP`)
 * - Génération d'un mini placeholder blur local (facultatif mais utile)
 */

/**
 * Qualité WebP des visuels déposés.
 *
 * Ce fichier annonçait « compression maîtrisée (0.80) » et encodait en réalité à **0,95**, avec
 * un commentaire « augmentation de la qualité pour le luxe ». Le résultat tenait dans les
 * chiffres : des flacons de **1 à 2,4 Mo** pour un cadre de 1024×1536, là où le même cadre
 * tient en **~90 Ko**. À l'œil, sur un flacon, 0,82 et 0,95 sont indiscernables ; à la facture
 * et au temps de chargement, il y a un facteur vingt.
 *
 * 0,82 est aussi la valeur retenue côté serveur par la refonte
 * (`WEBP_QUALITY` de `src/server/catalogue/webp.ts`) : une seule qualité dans tout le dépôt.
 */
const QUALITE_WEBP = 0.82;

export async function convertToWebp(
  file: File,
  /*
   * `mode` décide si l'on recadre.
   *
   * « cover » impose le portrait 2:3 de la charte : c'est le bon traitement
   * pour un flacon photographié, dont le cadrage est justement ce qu'on veut
   * uniformiser. Appliqué à un LOGO, il était destructeur — un logo large en
   * 1200×300 ressortait amputé à 200 px de large, soit un sixième de sa
   * largeur — et contredisait la règle du projet : « ne jamais modifier les
   * proportions d'un logo ».
   *
   * « fit » ne fait que plafonner la définition. Aucun pixel n'est perdu.
   */
  mode: "cover" | "fit" = "cover",
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);

  if (mode === "fit") {
    const maxEdge = 1024;
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cctx = c.getContext("2d");
    if (!cctx) {
      bitmap.close();
      return file;
    }
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const fitBlob = await new Promise<Blob | null>((resolve) =>
      c.toBlob(resolve, "image/webp", QUALITE_WEBP),
    );
    if (!fitBlob) return file;
    const fitName = file.name.replace(/\.[a-zA-Z0-9]+$/, "");
    return new File([fitBlob], `${fitName}.webp`, { type: "image/webp" });
  }

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
    canvas.toBlob(resolve, "image/webp", QUALITE_WEBP),
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

export async function uploadFile(
  file: File,
  mode: "cover" | "fit" = "cover",
): Promise<string> {
  const prepared = await convertToWebp(file, mode);

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

import {
  IMAGE_EXTENSIONS,
  IMAGE_TOO_HEAVY_MESSAGE,
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_UNREADABLE_MESSAGE,
  MAX_IMAGE_BYTES,
} from "@/contracts/catalogue";
import type { ActionError } from "@/contracts/result";

/**
 * Ce qui reste à l'appareil avant l'envoi d'une image (04 §12 ; décision du 17/09/2026).
 *
 * La conversion WebP, le recadrage portrait d'un visuel de parfum, le plafond d'un logo (jamais recadré)
 * et d'une planche story se font SUR LE SERVEUR (`src/server/catalogue/webp.ts`) : iOS Safari ne sait pas
 * encoder le WebP dans un canevas. L'appareil n'envoie que l'original, après deux gestes :
 * - **refuser tôt** ce qui n'est pas une image ou dépasse 12 Mo, avant le premier octet envoyé ;
 * - **HEIC/HEIF seulement : convertir en JPEG.** Le `sharp` précompilé du serveur (Windows comme Linux) ne
 *   décode pas le HEVC ; Safari, lui, décode le HEIC de son appareil photo. L'image entière est gardée
 *   (orientation appliquée par le décodeur, aucun recadrage), grand côté plafonné à 4096 px — le serveur ne
 *   produit rien de plus grand que 1920 px —, qualité 0,92.
 *
 * Le décodage et l'encodage du repli HEIC passent par un `ImageCodec` : le navigateur en vrai, un double
 * dans les tests (Node n'a ni canevas ni `createImageBitmap`).
 */

/** Plafond du JPEG de repli d'un HEIC, sur son grand côté. */
export const HEIC_MAX_EDGE = 4096;
export const HEIC_JPEG_QUALITY = 0.92;

export type Size = { width: number; height: number };

/** Plafonne le grand côté, sans jamais agrandir ni recadrer : l'image entière, à ses proportions. */
export function fitWithin(width: number, height: number, maxEdge: number): Size {
  const longest = Math.max(width, height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// ── Décodage et encodage (repli HEIC) ──────────────────────────────────────────

export type DecodedImage = Size & { close: () => void };

export type ImageCodec<D extends DecodedImage = DecodedImage> = {
  /** Lève si le format est illisible par l'appareil. */
  decode: (file: Blob) => Promise<D>;
  /** Dessine l'image entière dans un canevas `size` et l'encode en JPEG ; le type RÉEL du blob fait foi. */
  encodeJpeg: (image: D, size: Size, quality: number) => Promise<Blob | null>;
};

type BrowserImage = DecodedImage & { bitmap: ImageBitmap };

export const browserCodec: ImageCodec<BrowserImage> = {
  async decode(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  },
  async encodeJpeg(image, size, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image.bitmap, 0, 0, size.width, size.height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  },
};

// ── Refus ──────────────────────────────────────────────────────────────────────

/** Raisons de refus, courtes : elles terminent le toast « 1 visuel ajouté · 1 refusé : format illisible ». */
export const IMAGE_REFUSALS = {
  notAnImage: "ce n'est pas une image",
  unreadable: "format illisible",
  tooHeavy: "plus de 12 Mo",
  tooLarge: "plus de 100 millions de pixels",
  conversion: "conversion impossible sur cet appareil",
} as const;

const SHORT_REFUSALS: Record<string, string> = {
  [IMAGE_UNREADABLE_MESSAGE]: IMAGE_REFUSALS.unreadable,
  [IMAGE_TOO_HEAVY_MESSAGE]: IMAGE_REFUSALS.tooHeavy,
  [IMAGE_TOO_LARGE_MESSAGE]: IMAGE_REFUSALS.tooLarge,
};

/** La raison d'un refus du serveur, courte quand elle est connue (« format illisible »), sinon son message. */
export function refusalReason(error: Pick<ActionError, "message" | "fields">): string {
  const message = error.fields?.source ?? error.message;
  return SHORT_REFUSALS[message] ?? message;
}

// ── Préparation de l'original ──────────────────────────────────────────────────

/** Image, HEIC compris : Safari transmet parfois un HEIC sans type MIME. */
export function isImageFile(file: { type: string; name: string }): boolean {
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

export function isHeic(file: { type: string; name: string }): boolean {
  return /^image\/hei[cf](-sequence)?$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

const EXTENSION_OF_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
};

/**
 * L'extension qui nomme l'original sur le serveur : celle du nom si elle est acceptée, sinon celle du type
 * (« photo » sans extension, type image/png → png). Le format réel est relu par le serveur dans les octets.
 */
export function uploadExtension(file: { type: string; name: string }): string {
  const dot = file.name.lastIndexOf(".");
  const fromName = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(fromName)) return fromName;
  return EXTENSION_OF_TYPE[file.type.toLowerCase()] ?? (fromName || "jpg");
}

function jpegName(original: string): string {
  const base = original.replace(/\.[a-zA-Z0-9]+$/, "").trim();
  return `${base || "photo"}.jpg`;
}

/**
 * L'original à envoyer : le fichier tel quel, ou — HEIC/HEIF seulement — sa conversion JPEG. Refus avec une
 * raison courte (`IMAGE_REFUSALS`) : pas une image, plus de 12 Mo, HEIC illisible par l'appareil.
 */
export async function prepareUpload<D extends DecodedImage>(
  file: File,
  codec: ImageCodec<D> = browserCodec as unknown as ImageCodec<D>,
): Promise<File> {
  if (!isImageFile(file)) throw new Error(IMAGE_REFUSALS.notAnImage);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(IMAGE_REFUSALS.tooHeavy);
  if (!isHeic(file)) return file;

  let image: D;
  try {
    image = await codec.decode(file);
  } catch {
    throw new Error(IMAGE_REFUSALS.unreadable);
  }
  try {
    const blob = await codec.encodeJpeg(image, fitWithin(image.width, image.height, HEIC_MAX_EDGE), HEIC_JPEG_QUALITY);
    if (!blob || blob.type !== "image/jpeg") throw new Error(IMAGE_REFUSALS.conversion);
    if (blob.size > MAX_IMAGE_BYTES) throw new Error(IMAGE_REFUSALS.tooHeavy);
    return new File([blob], jpegName(file.name), { type: "image/jpeg" });
  } finally {
    image.close();
  }
}

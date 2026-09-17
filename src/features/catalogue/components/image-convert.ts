import { MAX_STORY_BYTES } from "@/contracts/catalogue";
import type { ImageCrop } from "@/ui/patterns/ImageField";

/**
 * Préparation des images sur l'appareil, avant tout envoi (04 §12 ; 07 J11 ; reprise de
 * `src/lib/admin/image-utils.ts` de la production).
 *
 * Trois traitements, un par usage, jamais mélangés :
 * - **visuel de parfum** (`crop: "portrait"`) : recadrage « cover » au portrait 2:3 de la charte,
 *   1024 × 1536, WebP. C'est le bon geste pour un flacon photographié, dont on veut uniformiser le cadre ;
 * - **logo de marque** (`crop: "none"`) : AUCUN recadrage, seulement la définition plafonnée à 1024 px
 *   sur le grand côté. Règle projet : on ne modifie jamais les proportions d'un logo (la production le
 *   recadrait en 2:3 jusqu'au 10/09/2026, `12e2327`) ;
 * - **planche story** (`prepareStoryImage`) : jamais recadrée non plus (une planche 9:16 recadrée en 2:3
 *   perd le nom du parfum et les notes), grand côté plafonné à 1920 px, 12 Mo au plus avant envoi.
 *
 * La géométrie est pure (testée sans navigateur) ; le décodage et l'encodage passent par un `ImageCodec`
 * — le navigateur en vrai, un double dans les tests. La conversion WebP sert aussi de garde-fou : un
 * HEIC d'iPhone devient une image que tous les navigateurs affichent.
 */

/** Cadre du visuel de catalogue (portrait 2:3 de la charte). */
export const PERFUME_FRAME = { width: 1024, height: 1536 } as const;
/** Plafond d'un logo sur son grand côté : aucun pixel perdu, proportions intactes. */
export const LOGO_MAX_EDGE = 1024;
/** Plafond d'une planche story sur son grand côté. */
export const STORY_MAX_EDGE = 1920;

const CATALOGUE_QUALITY = 0.95;
const STORY_QUALITY = 0.92;

export type Rect = { x: number; y: number; width: number; height: number };

/** Ce qu'on lit de l'image source (`source`) et la taille du fichier produit (`output`). */
export type Geometry = { source: Rect; output: { width: number; height: number } };

/** « Cover » dans le portrait 1024 × 1536 : le surplus est rogné à parts égales, au centre. */
export function portraitCover(width: number, height: number): Geometry {
  const target = PERFUME_FRAME.width / PERFUME_FRAME.height;
  const ratio = width / height;
  const source =
    ratio > target
      ? { width: height * target, height, x: (width - height * target) / 2, y: 0 }
      : { width, height: width / target, x: 0, y: (height - width / target) / 2 };
  return { source, output: { width: PERFUME_FRAME.width, height: PERFUME_FRAME.height } };
}

/** Plafonne le grand côté, sans jamais agrandir ni recadrer : l'image entière, à ses proportions. */
export function fitWithin(width: number, height: number, maxEdge: number): Geometry {
  const longest = Math.max(width, height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  return {
    source: { x: 0, y: 0, width, height },
    output: { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) },
  };
}

/** Géométrie d'un envoi de catalogue : portrait pour un parfum, proportions d'origine pour un logo. */
export function catalogueGeometry(crop: ImageCrop, width: number, height: number): Geometry {
  return crop === "portrait" ? portraitCover(width, height) : fitWithin(width, height, LOGO_MAX_EDGE);
}

// ── Décodage et encodage ───────────────────────────────────────────────────────

export type DecodedImage = { width: number; height: number; close: () => void };

export type ImageCodec<D extends DecodedImage = DecodedImage> = {
  /** Lève si le format est illisible par l'appareil. */
  decode: (file: Blob) => Promise<D>;
  /**
   * Dessine `geometry.source` de l'image dans un canevas `geometry.output` et l'encode au type demandé.
   * Un navigateur qui ne sait pas l'encoder rend un autre type (Safari rend du PNG pour « image/webp ») :
   * le type RÉEL du blob fait foi.
   */
  encode: (image: D, geometry: Geometry, quality: number, type: string) => Promise<Blob | null>;
};

type BrowserImage = DecodedImage & { bitmap: ImageBitmap };

export const browserCodec: ImageCodec<BrowserImage> = {
  async decode(file) {
    const bitmap = await createImageBitmap(file);
    return { bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  },
  async encode(image, geometry, quality, type) {
    const canvas = document.createElement("canvas");
    canvas.width = geometry.output.width;
    canvas.height = geometry.output.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const { x, y, width, height } = geometry.source;
    context.drawImage(image.bitmap, x, y, width, height, 0, 0, geometry.output.width, geometry.output.height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  },
};

/** Un fichier prêt à partir : WebP, et ses dimensions réelles. */
export type PreparedImage = { file: File; width: number; height: number };

/** Raisons de refus, courtes : elles terminent le toast « 1 visuel ajouté · 1 refusé : format illisible ». */
export const IMAGE_REFUSALS = {
  notAnImage: "ce n'est pas une image",
  unreadable: "format illisible",
  tooHeavy: "plus de 12 Mo",
  conversion: "conversion impossible sur cet appareil",
} as const;

/** Image, HEIC compris : Safari transmet parfois un HEIC sans type MIME. */
export function isImageFile(file: { type: string; name: string }): boolean {
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

function outputName(original: string, fallback: string, type: string): string {
  const base = original.replace(/\.[a-zA-Z0-9]+$/, "").trim();
  return `${base || fallback}.${EXTENSIONS[type] ?? "webp"}`;
}

/**
 * WebP d'abord (format du catalogue) ; un appareil qui ne l'encode pas (Safari iOS rend du PNG sous le nom
 * WebP) reçoit un repli HONNÊTE, nommé et typé comme ce qu'il contient : PNG pour le catalogue (la
 * transparence d'un flacon détouré ou d'un logo est gardée), JPEG pour une planche story (opaque, bien
 * plus légère).
 */
async function encodeWithFallback<D extends DecodedImage>(
  codec: ImageCodec<D>,
  image: D,
  geometry: Geometry,
  quality: number,
  fallbackType: "image/png" | "image/jpeg",
): Promise<Blob | null> {
  const webp = await codec.encode(image, geometry, quality, "image/webp");
  if (webp && webp.type === "image/webp") return webp;
  return codec.encode(image, geometry, quality, fallbackType);
}

async function convert<D extends DecodedImage>(
  file: File,
  geometryOf: (width: number, height: number) => Geometry,
  quality: number,
  codec: ImageCodec<D>,
  fallbackName: string,
  fallbackType: "image/png" | "image/jpeg",
): Promise<PreparedImage> {
  if (!isImageFile(file)) throw new Error(IMAGE_REFUSALS.notAnImage);
  let image: D;
  try {
    image = await codec.decode(file);
  } catch {
    throw new Error(IMAGE_REFUSALS.unreadable);
  }
  try {
    const geometry = geometryOf(image.width, image.height);
    const blob = await encodeWithFallback(codec, image, geometry, quality, fallbackType);
    if (!blob || !(blob.type in EXTENSIONS)) throw new Error(IMAGE_REFUSALS.conversion);
    return {
      file: new File([blob], outputName(file.name, fallbackName, blob.type), { type: blob.type }),
      width: geometry.output.width,
      height: geometry.output.height,
    };
  } finally {
    image.close();
  }
}

/** Visuel de parfum (portrait 1024 × 1536) ou logo (proportions d'origine, 1024 px au plus). */
export function convertCatalogueImage<D extends DecodedImage>(
  file: File,
  crop: ImageCrop,
  codec: ImageCodec<D> = browserCodec as unknown as ImageCodec<D>,
): Promise<PreparedImage> {
  return convert(file, (w, h) => catalogueGeometry(crop, w, h), CATALOGUE_QUALITY, codec, crop === "none" ? "logo" : "visuel", "image/png");
}

/** Planche story : jamais recadrée, 1920 px au plus, refusée au-delà de 12 Mo avant le premier octet envoyé. */
export function prepareStoryImage<D extends DecodedImage>(
  file: File,
  codec: ImageCodec<D> = browserCodec as unknown as ImageCodec<D>,
): Promise<PreparedImage> {
  if (file.size > MAX_STORY_BYTES) return Promise.reject(new Error(IMAGE_REFUSALS.tooHeavy));
  return convert(file, (w, h) => fitWithin(w, h, STORY_MAX_EDGE), STORY_QUALITY, codec, "visuel", "image/jpeg");
}

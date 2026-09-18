import "server-only";
import type { Sharp, SharpOptions } from "sharp";
import { IMAGE_TOO_LARGE_MESSAGE, IMAGE_UNREADABLE_MESSAGE, type ImageUsage } from "@/contracts/catalogue";
import { DomainError } from "@/domain/errors";

/**
 * Conversion WebP des images de la gestion, CÔTÉ SERVEUR (04 §12 ; décision du 17/09/2026 : iOS Safari ne
 * sait pas encoder le WebP dans un canevas, le repli PNG/JPEG de l'appareil trahissait « WebP obligatoire »).
 *
 * Un traitement par usage, jamais mélangés :
 * - **visuel de parfum** : recadrage « cover » centré au portrait 2:3 de la charte, 1024 × 1536 (comme la
 *   préparation sur l'appareil qu'il remplace) ;
 * - **logo de marque** : AUCUN recadrage — proportions intouchables (règle projet) —, grand côté plafonné
 *   à 1024 px, jamais agrandi ;
 * - **planche story** : jamais recadrée non plus (une planche 9:16 recadrée perd le nom et les notes),
 *   grand côté plafonné à 1920 px, jamais agrandie.
 *
 * Pour tous : orientation EXIF appliquée (`rotate()`) puis métadonnées retirées (EXIF, GPS, profil), un
 * profil embarqué (Display P3 de l'iPhone) converti en sRGB, transparence conservée (WebP avec alpha).
 * Entrées lues : JPEG, PNG, WebP, GIF (première image), AVIF. Le HEIC (HEVC) N'EST PAS décodé par les
 * binaires précompilés de sharp (Windows comme Linux) : l'appareil le convertit en JPEG avant l'envoi
 * (`src/features/catalogue/components/image-convert.ts`) ; reçu tel quel, il est refusé « format illisible ».
 *
 * `sharp` est chargé à la première conversion, pas à l'import : les autres actions du catalogue ne paient
 * pas le chargement d'un module natif.
 */

export const WEBP_QUALITY = 82;
/** 0 (rapide) à 6 (lent) : 4, la valeur par défaut de libwebp, tient une photo de 12 Mpx sous 0,5 s. */
export const WEBP_EFFORT = 4;
/** Cadre du visuel de catalogue (portrait 2:3 de la charte). */
export const PERFUME_FRAME = { width: 1024, height: 1536 } as const;
/** Plafond d'un logo sur son grand côté : proportions intactes. */
export const LOGO_MAX_EDGE = 1024;
/** Plafond d'une planche story sur son grand côté. */
export const STORY_MAX_EDGE = 1920;
/** Garde contre une « bombe » de décompression (quelques Mo de PNG, des milliards de pixels). */
export const MAX_INPUT_PIXELS = 100_000_000;

/** Formats lus (`metadata().format`) : `heif` couvre l'AVIF ; un HEIC y entre mais échoue au décodage. */
const READABLE_FORMATS = new Set(["jpeg", "png", "webp", "gif", "heif"]);

export type WebpImage = {
  data: Buffer;
  width: number;
  height: number;
  bytes: number;
  hasAlpha: boolean;
};

type SharpFactory = typeof import("sharp");

let loaded: Promise<SharpFactory> | null = null;

function loadSharp(): Promise<SharpFactory> {
  loaded ??= import("sharp").then((module) => (module as unknown as { default?: SharpFactory }).default ?? (module as unknown as SharpFactory));
  return loaded;
}

const INPUT: SharpOptions = { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS };
/** Lecture de l'en-tête seul (rien n'est décodé) : sans plafond, pour dire « trop grande » plutôt qu'« illisible ». */
const HEADER: SharpOptions = { failOn: "error", limitInputPixels: false };

const unreadable = () => new DomainError("VALIDATION", IMAGE_UNREADABLE_MESSAGE, "source");

function frame(image: Sharp, usage: ImageUsage): Sharp {
  switch (usage) {
    case "parfum":
      return image.resize(PERFUME_FRAME.width, PERFUME_FRAME.height, { fit: "cover", position: "centre" });
    case "logo":
      return image.resize(LOGO_MAX_EDGE, LOGO_MAX_EDGE, { fit: "inside", withoutEnlargement: true });
    case "story":
      return image.resize(STORY_MAX_EDGE, STORY_MAX_EDGE, { fit: "inside", withoutEnlargement: true });
    default: {
      const _exhaustive: never = usage;
      return _exhaustive;
    }
  }
}

/** Largeur et hauteur lues dans l'en-tête ; `VALIDATION` « format illisible » si ce n'est pas une image acceptée. */
export async function imageDimensions(input: Uint8Array): Promise<{ width: number; height: number }> {
  const sharp = await loadSharp();
  let metadata: Awaited<ReturnType<Sharp["metadata"]>>;
  try {
    metadata = await sharp(input, HEADER).metadata();
  } catch {
    throw unreadable();
  }
  if (!metadata.format || !READABLE_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) throw unreadable();
  return { width: metadata.width, height: metadata.height };
}

/**
 * L'original, converti en WebP selon son usage. Refus (`VALIDATION`, champ `source`) : format illisible ou
 * non accepté, plus de 100 millions de pixels. Déterministe : la même entrée rend les mêmes octets.
 */
export async function toWebp(input: Uint8Array, usage: ImageUsage): Promise<WebpImage> {
  const { width, height } = await imageDimensions(input);
  if (width * height > MAX_INPUT_PIXELS) throw new DomainError("VALIDATION", IMAGE_TOO_LARGE_MESSAGE, "source");
  const sharp = await loadSharp();
  try {
    const { data, info } = await frame(sharp(input, INPUT).rotate(), usage)
      .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, bytes: info.size, hasAlpha: info.channels === 4 };
  } catch {
    throw unreadable();
  }
}

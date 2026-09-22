import sharp from "sharp";
import { E2E_STORAGE_URL } from "../support/env";

/**
 * Images de test fabriquées à la volée (aucun binaire versionné) et lecture du faux stockage
 * (`e2e/support/fake-storage-server.ts`).
 */

export type TestFile = { name: string; mimeType: string; buffer: Buffer };

/** Un PNG uni de la taille demandée : un flacon photographié, une planche story 9:16, un logo carré. */
export async function png(name: string, width: number, height: number, color = { r: 123, g: 11, b: 29 }): Promise<TestFile> {
  const buffer = await sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
  return { name, mimeType: "image/png", buffer };
}

/**
 * Photo « HEIC » de l'iPhone. Les navigateurs du banc (Chromium, WebKit sous Windows) ne décodent pas le
 * vrai HEIC ; le fichier porte donc le nom et le type d'un HEIC avec un contenu lisible, ce qui éprouve ce
 * que l'app contrôle : l'extension acceptée par le sélecteur, le repli JPEG de l'appareil (le sharp du
 * serveur ne décode pas le HEVC), l'envoi sous un nom neuf, puis la conversion WebP du serveur.
 */
export async function heic(name: string, width: number, height: number): Promise<TestFile> {
  const file = await png(name, width, height, { r: 30, g: 30, b: 30 });
  return { ...file, mimeType: "image/heic" };
}

/** Un fichier illisible qui se dit HEIC : il doit être refusé sans arrêter les autres. */
export function unreadableHeic(name: string): TestFile {
  return { name, mimeType: "image/heic", buffer: Buffer.from("pas une image du tout") };
}

/** Un logo PNG transparent : un pavé opaque centré sur un fond entièrement transparent. */
export async function transparentPng(name: string, width: number, height: number): Promise<TestFile> {
  const buffer = await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      {
        input: { create: { width: Math.round(width / 2), height: Math.round(height / 4), channels: 4, background: { r: 20, g: 20, b: 20, alpha: 1 } } },
        left: Math.round(width / 4),
        top: Math.round((height * 3) / 8),
      },
    ])
    .png()
    .toBuffer();
  return { name, mimeType: "image/png", buffer };
}

/**
 * Un TIFF nommé `.png` : l'appareil l'accepte (type `image/png`), le SERVEUR lit les octets et refuse
 * « format illisible » — la seule façon d'éprouver un refus de conversion de bout en bout.
 */
export async function tiffNamedPng(name: string): Promise<TestFile> {
  const buffer = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 10, g: 10, b: 10 } } }).tiff().toBuffer();
  return { name, mimeType: "image/png", buffer };
}

/** Clés présentes dans le faux stockage (`catalog/stories/12/…`). */
export async function storedKeys(): Promise<string[]> {
  const response = await fetch(`${E2E_STORAGE_URL}/__fake/objects`);
  const body = (await response.json()) as { keys: string[] };
  return body.keys;
}

/**
 * Ce que contient VRAIMENT un objet du faux stockage (`catalog/perfumes/…webp`), lu par sharp : format réel
 * (pas l'extension), dimensions, transparence.
 */
export async function storedImage(key: string): Promise<{ format: string | undefined; width: number | undefined; height: number | undefined; hasAlpha: boolean | undefined }> {
  const response = await fetch(`${E2E_STORAGE_URL}/storage/v1/object/public/${key}`);
  if (!response.ok) throw new Error(`Faux stockage : ${key} introuvable (${response.status})`);
  const { format, width, height, hasAlpha } = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  return { format, width, height, hasAlpha };
}

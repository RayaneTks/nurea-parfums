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
 * que l'app contrôle : l'extension acceptée par le sélecteur, la préparation, l'envoi sous un nom neuf.
 */
export async function heic(name: string, width: number, height: number): Promise<TestFile> {
  const file = await png(name, width, height, { r: 30, g: 30, b: 30 });
  return { ...file, mimeType: "image/heic" };
}

/** Un fichier illisible qui se dit HEIC : il doit être refusé sans arrêter les autres. */
export function unreadableHeic(name: string): TestFile {
  return { name, mimeType: "image/heic", buffer: Buffer.from("pas une image du tout") };
}

/** Clés présentes dans le faux stockage (`catalog/stories/12/…`). */
export async function storedKeys(): Promise<string[]> {
  const response = await fetch(`${E2E_STORAGE_URL}/__fake/objects`);
  const body = (await response.json()) as { keys: string[] };
  return body.keys;
}

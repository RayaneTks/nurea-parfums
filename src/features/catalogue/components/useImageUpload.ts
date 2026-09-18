"use client";

import { useCallback } from "react";
import type { ImageUploadTicket } from "@/contracts/catalogue";
import { useAction } from "@/app-shell/hooks/useAction";
import { convertImageAction, createImageUploadUrlAction } from "@/server/catalogue/actions";
import type { ImageCrop } from "@/ui/patterns/ImageField";

/**
 * Le code de conversion (décodage HEIC, canevas, ré-encodage JPEG) n'arrive qu'au PREMIER envoi
 * d'image (04 §15 règle 11) : il ne pèse sur aucun écran, pas même la fiche parfum qu'on ouvre pour
 * lire un prix. `import()` plutôt que `next/dynamic` : ce n'est pas un composant, c'est du code
 * appelé dans un geste déjà asynchrone — l'attente se confond avec la lecture du fichier.
 */
const imageConvert = () => import("./image-convert");

/**
 * Envoi d'une image (04 §12 ; décision du 17/09/2026) : l'appareil envoie l'ORIGINAL directement au bucket,
 * sur le chemin temporaire signé par le serveur (le serveur de Next ne relaie jamais les octets) ; une
 * action serveur le convertit ensuite en WebP à son chemin définitif. Seul le HEIC est d'abord converti en
 * JPEG sur l'appareil (`image-convert.ts`). Le geste de l'utilisateur ne change pas.
 */

export const UPLOAD_REFUSED = "envoi refusé par le stockage";

async function putToSignedUrl(ticket: ImageUploadTicket, file: File): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ticket.signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        Authorization: `Bearer ${ticket.token}`,
        "x-upsert": "true",
      },
    });
  } catch {
    throw new Error("pas de réseau");
  }
  if (!response.ok) throw new Error(response.status === 413 ? "fichier trop lourd pour le stockage" : UPLOAD_REFUSED);
}

/** De quoi ranger un visuel story (`addPerfumeMediaAction`) : l'original envoyé, chemin décidé par le serveur. */
export type StoryUpload = { source: string };

type UploadTarget = { usage: "parfum" | "logo" } | { usage: "story"; perfumeId: number };

export function useImageUpload() {
  const { run: requestTicket } = useAction(createImageUploadUrlAction, { errors: "inline" });
  const { run: convert } = useAction(convertImageAction, { errors: "inline" });

  /** Prépare puis envoie l'original ; rend son chemin temporaire. */
  const sendOriginal = useCallback(
    async (file: File, target: UploadTarget): Promise<string> => {
      const { prepareUpload, uploadExtension } = await imageConvert();
      const original = await prepareUpload(file);
      const ticket = await requestTicket({ ...target, extension: uploadExtension(original) });
      if (!ticket.ok) throw new Error(ticket.error.fields?.extension ?? ticket.error.fields?.perfumeId ?? ticket.error.message);
      await putToSignedUrl(ticket.data, original);
      return ticket.data.path;
    },
    [requestTicket],
  );

  /** Visuel de parfum (portrait) ou logo (jamais recadré) : rend l'URL publique du WebP converti. */
  const uploadCatalogueImage = useCallback(
    async (file: File, options: { crop: ImageCrop }): Promise<string> => {
      const usage = options.crop === "none" ? "logo" : "parfum";
      const source = await sendOriginal(file, { usage });
      const result = await convert({ usage, source });
      if (!result.ok) throw new Error((await imageConvert()).refusalReason(result.error));
      return result.data.url;
    },
    [sendOriginal, convert],
  );

  /** Planche story : l'original envoyé, que `addPerfumeMediaAction` convertit et range. */
  const uploadStory = useCallback(
    async (file: File, perfumeId: number): Promise<StoryUpload> => ({
      source: await sendOriginal(file, { usage: "story", perfumeId }),
    }),
    [sendOriginal],
  );

  return { uploadCatalogueImage, uploadStory };
}

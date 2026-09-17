"use client";

import { useCallback } from "react";
import type { ImageUploadTicket } from "@/contracts/catalogue";
import { useAction } from "@/app-shell/hooks/useAction";
import { createImageUploadUrlAction } from "@/server/catalogue/actions";
import type { ImageCrop } from "@/ui/patterns/ImageField";
import { convertCatalogueImage, prepareStoryImage, type PreparedImage } from "./image-convert";

/**
 * Envoi d'une image au stockage (04 §12) : préparée sur l'appareil (`image-convert.ts`), puis envoyée
 * directement au bucket par l'URL signée que rend le serveur — qui décide seul du chemin. Le serveur ne
 * relaie jamais les octets.
 */

export const UPLOAD_REFUSED = "envoi refusé par le stockage";

async function putToSignedUrl(ticket: ImageUploadTicket, prepared: PreparedImage): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ticket.signedUrl, {
      method: "PUT",
      body: prepared.file,
      headers: {
        "Content-Type": prepared.file.type,
        Authorization: `Bearer ${ticket.token}`,
        "x-upsert": "true",
      },
    });
  } catch {
    throw new Error("pas de réseau");
  }
  if (!response.ok) throw new Error(response.status === 413 ? "fichier trop lourd pour le stockage" : UPLOAD_REFUSED);
}

export type StoryUpload = { path: string; width: number; height: number; bytes: number };

export function useImageUpload() {
  const { run } = useAction(createImageUploadUrlAction, { errors: "inline" });

  const ticketFor = useCallback(
    async (input: Parameters<typeof createImageUploadUrlAction>[0]): Promise<ImageUploadTicket> => {
      const result = await run(input);
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    [run],
  );

  /** Visuel de parfum ou logo : rend l'URL publique de l'objet envoyé. */
  const uploadCatalogueImage = useCallback(
    async (file: File, options: { crop: ImageCrop }): Promise<string> => {
      const prepared = await convertCatalogueImage(file, options.crop);
      const ticket = await ticketFor({ usage: options.crop === "none" ? "logo" : "parfum", extension: prepared.file.name });
      await putToSignedUrl(ticket, prepared);
      return ticket.publicUrl;
    },
    [ticketFor],
  );

  /** Planche story : rend de quoi la ranger (`addPerfumeMediaAction`), chemin décidé par le serveur. */
  const uploadStory = useCallback(
    async (file: File, perfumeId: number): Promise<StoryUpload> => {
      const prepared = await prepareStoryImage(file);
      const ticket = await ticketFor({ usage: "story", perfumeId, extension: prepared.file.name });
      await putToSignedUrl(ticket, prepared);
      return { path: ticket.path, width: prepared.width, height: prepared.height, bytes: prepared.file.size };
    },
    [ticketFor],
  );

  return { uploadCatalogueImage, uploadStory };
}

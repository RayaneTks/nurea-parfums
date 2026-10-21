import sharp from "sharp";
import { getSeoPerfume } from "@/lib/catalogue-service";
import { deriveAmbientHex } from "@/lib/catalog/ambient";
import { hasThumbnail, thumbnailOf } from "@/lib/images/thumbnails";
import { perfumeIdFromSegment } from "@/lib/seo/paths";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, vignetteParfum, vignetteSite } from "../../../_og/vignettes";

/**
 * Vignette de partage d'une fiche (T17) : c'est ce lien qu'on met en story. Rendu dans
 * `_og/vignettes.tsx` ; ici, la lecture de la fiche et de son visuel.
 *
 * Le visuel est le sombre (image principale, comme la vignette), lu dans sa déclinaison 640 × 960
 * quand elle existe — assez pour 420 × 630 — et converti en PNG : `next/og` ne lit pas le WebP.
 * Une fiche introuvable reçoit la vignette du site ; un visuel illisible, la fiche sans visuel.
 */
export const runtime = "nodejs";
export const alt = `Fiche parfum — ${SITE_NAME}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpenGraphImage({ params }: { params: Promise<{ parfum: string }> }) {
  const id = perfumeIdFromSegment((await params).parfum);
  const found = id === null ? null : await getSeoPerfume(id);
  if (!found) return vignetteSite();

  const { brand, perfume } = found;
  const ambiance =
    perfume.ambientHue != null && perfume.ambientChroma != null
      ? deriveAmbientHex("dark", perfume.ambientHue, perfume.ambientChroma)
      : null;
  return vignetteParfum({ marque: brand.name, nom: perfume.name, visuel: await lireVisuel(perfume.image), ambiance });
}

async function lireVisuel(image: string): Promise<string | null> {
  try {
    const url = new URL(hasThumbnail(image) ? thumbnailOf(image) : image, SITE_URL);
    const reponse = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!reponse.ok) return null;
    const png = await sharp(Buffer.from(await reponse.arrayBuffer())).resize(420, 630, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

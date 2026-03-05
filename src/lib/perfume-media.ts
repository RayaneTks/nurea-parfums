import rabanneImage from "@/assets/parfums/complete/RABANNE.png";
import dgImage from "@/assets/parfums/complete/D&G.png";
import jpgImage from "@/assets/parfums/complete/JPG.png";
import azzaroImage from "@/assets/parfums/complete/AZZARO.png";
import guerlainImage from "@/assets/parfums/complete/GUERLAIN.png";
import diorImage from "@/assets/parfums/complete/DIOR.png";
import bossImage from "@/assets/parfums/complete/BOSS.png";

/**
 * Retourne l'URL publique attendue pour une image de parfum.
 * Convention: placer les fichiers dans /public/parfums/{id}.png
 */
export const getPerfumeImage = (perfumeId: string): string | null => {
  if (!perfumeId) return null;
  return `/parfums/${perfumeId}.png`;
};

const brandImages = {
  Rabanne: rabanneImage,
  "Dolce & Gabbana": dgImage,
  "Jean Paul Gaultier": jpgImage,
  Azzaro: azzaroImage,
  Guerlain: guerlainImage,
  Dior: diorImage,
  "Hugo Boss": bossImage,
};

export const getBrandImage = (brandName: string): string | null => {
  const img = brandImages[brandName as keyof typeof brandImages];
  if (!img) return null;
  return typeof img === "string" ? img : (img as { src: string }).src;
};

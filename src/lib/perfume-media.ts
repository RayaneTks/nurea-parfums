import rabanneImage from "@/assets/parfums/complete/RABANNE.png";
import dgImage from "@/assets/parfums/complete/D&G.png";
import jpgImage from "@/assets/parfums/complete/JPG.png";
import azzaroImage from "@/assets/parfums/complete/AZZARO.png";
import guerlainImage from "@/assets/parfums/complete/GUERLAIN.png";
import diorImage from "@/assets/parfums/complete/DIOR.png";
import bossImage from "@/assets/parfums/complete/BOSS.png";

const perfumeImagesModules = import.meta.glob<{ default: string }>("@/assets/parfums/**/*.{png,jpeg,jpg}", {
  eager: true,
});

const perfumeImagesMap = new Map<string, string>();

Object.entries(perfumeImagesModules).forEach(([path, module]) => {
  if (path.includes("/complete/")) {
    return;
  }

  const fileName = path.split("/").pop()?.replace(/\.(png|jpeg|jpg)$/i, "") || "";
  if (module.default) {
    perfumeImagesMap.set(fileName.toLowerCase(), module.default);
  }
});

export const getPerfumeImage = (perfumeId: string): string | null => perfumeImagesMap.get(perfumeId.toLowerCase()) || null;

const brandImages: Record<string, string> = {
  Rabanne: rabanneImage,
  "Dolce & Gabbana": dgImage,
  "Jean Paul Gaultier": jpgImage,
  Azzaro: azzaroImage,
  Guerlain: guerlainImage,
  Dior: diorImage,
  "Hugo Boss": bossImage,
};

export const getBrandImage = (brandName: string): string | null => brandImages[brandName] ?? null;

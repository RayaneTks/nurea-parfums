import { Brand } from "@/data/perfumes";

// Import des images de marques
import rabanneImage from "@/assets/parfums/complete/RABANNE.png";
import dgImage from "@/assets/parfums/complete/D&G.png";
import jpgImage from "@/assets/parfums/complete/JPG.png";
import azzaroImage from "@/assets/parfums/complete/AZZARO.png";
import lacosteImage from "@/assets/parfums/complete/LACOSTE.png";
import guerlainImage from "@/assets/parfums/complete/GUERLAIN.png";
import diorImage from "@/assets/parfums/complete/DIOR.png";
import armaniImage from "@/assets/parfums/complete/ARMANI.png";
import bossImage from "@/assets/parfums/complete/BOSS.png";

interface BrandCardProps {
  brand: Brand;
  onClick: () => void;
}

const brandImages: Record<string, string> = {
  "Rabanne": rabanneImage,
  "Dolce & Gabbana": dgImage,
  "Jean Paul Gaultier": jpgImage,
  "Azzaro": azzaroImage,
  "Lacoste": lacosteImage,
  "Guerlain": guerlainImage,
  "Dior": diorImage,
  "Armani": armaniImage,
  "Hugo Boss": bossImage,
};

export const BrandCard = ({ brand, onClick }: BrandCardProps) => {
  const brandImage = brandImages[brand.name] || null;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer flex flex-col transition-all duration-500"
    >
      {/* Container image - Pleine largeur, design premium */}
      <div className="relative w-full aspect-[2/3] md:aspect-[3/4] flex items-end justify-center bg-background/5 overflow-hidden">
        {/* Image de la marque - Prend maximum d'espace */}
        {brandImage && (
          <img
            src={brandImage}
            alt={brand.name}
            className="w-full h-[90%] object-contain object-bottom p-4 md:p-6 lg:p-8 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Nom de la marque - Minimaliste, en dessous */}
      <div className="mt-4 px-2 text-center">
        <h3 className="font-serif text-base md:text-lg text-foreground/90 group-hover:text-foreground transition-colors duration-300 leading-tight font-light">
          {brand.name}
        </h3>
      </div>
    </div>
  );
};


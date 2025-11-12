import { Brand } from "@/data/perfumes";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

// Import des images de marques
import rabanneImage from "@/assets/parfums/complete/RABANNE.png";
import dgImage from "@/assets/parfums/complete/D&G.png";
import jpgImage from "@/assets/parfums/complete/JPG.png";
import azzaroImage from "@/assets/parfums/complete/AZZARO.png";
import guerlainImage from "@/assets/parfums/complete/GUERLAIN.png";
import diorImage from "@/assets/parfums/complete/DIOR.png";
import bossImage from "@/assets/parfums/complete/BOSS.png";

interface BrandCardProps {
  brand: Brand;
  onClick: () => void;
  variant?: "desktop" | "mobile";
}

const brandImages: Record<string, string> = {
  "Rabanne": rabanneImage,
  "Dolce & Gabbana": dgImage,
  "Jean Paul Gaultier": jpgImage,
  "Azzaro": azzaroImage,
  "Guerlain": guerlainImage,
  "Dior": diorImage,
  "Hugo Boss": bossImage,
  "Xerjoff": "", // Pas d'image pour Xerjoff
};

export const BrandCard = ({ brand, onClick, variant = "desktop" }: BrandCardProps) => {
  const brandImage = brandImages[brand.name] || null;

  // Version Desktop : Card avec hover effect, nom visible au survol
  if (variant === "desktop") {
    return (
      <Card
        onClick={onClick}
        className={cn(
          "group relative cursor-pointer overflow-hidden",
          "bg-background/50 border-border/20",
          "hover:border-border/50 hover:shadow-xl",
          "transition-all duration-500 ease-out",
          "h-full flex flex-col",
          "min-h-[500px] lg:min-h-[600px]"
        )}
      >
        {/* Container image - Grande hauteur - Image remplit complètement */}
        <div className="relative w-full flex-1 overflow-hidden min-h-[450px] lg:min-h-[550px]">
          {/* Image de la marque */}
          {brandImage ? (
            <img
              src={brandImage}
              alt={brand.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background/5">
              <div className="text-center">
                <div className="w-16 h-16 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 border border-muted-foreground/15 rounded-sm"></div>
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground/20 font-light">Image à venir</div>
              </div>
            </div>
          )}
          
          {/* Overlay avec nom au survol */}
          <div className="absolute inset-0 bg-background/85 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center z-10">
            <div className="text-center px-6 py-8">
              <h3 className="font-serif text-2xl lg:text-3xl text-foreground font-light leading-tight mb-2">
                {brand.name}
              </h3>
              <p className="text-base text-muted-foreground/90 font-light mb-1">
                Gamme complète
              </p>
              {brand.category && (
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-2 font-light">
                  {brand.category}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Version Mobile : Carousel plein écran avec nom au-dessus et image pleine écran
  return (
    <div className="w-full pb-16">
      {/* Nom de la marque au-dessus - Style élégant */}
      <div className="mb-4 px-4 text-center">
        <h3 className="font-serif text-xl text-foreground font-light leading-tight mb-1.5">
          {brand.name}
        </h3>
        <p className="text-sm text-muted-foreground/80 font-light mb-1">
          Gamme complète
        </p>
        {brand.category && (
          <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-light">
            {brand.category}
          </p>
        )}
      </div>

      {/* Card avec image - Image pleine écran */}
      <Card
        onClick={onClick}
        className={cn(
          "relative cursor-pointer overflow-hidden",
          "bg-background/50 border-border/30",
          "active:scale-[0.98] transition-transform duration-200",
          "w-full shadow-lg"
        )}
      >
        {/* Container image - Hauteur optimisée pour mobile plein écran */}
        <div className="relative w-full overflow-hidden h-[calc(100vh-280px)] min-h-[450px] max-h-[600px]">
          {/* Image de la marque */}
          {brandImage ? (
            <img
              src={brandImage}
              alt={brand.name}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background/5">
              <div className="text-center">
                <div className="w-16 h-16 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 border border-muted-foreground/15 rounded-sm"></div>
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground/20 font-light">Image à venir</div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};


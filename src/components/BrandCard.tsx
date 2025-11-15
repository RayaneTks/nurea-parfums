import { Brand } from "@/data/perfumes";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
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

  // Version Desktop : Card avec ratio 2:3 et object-fit cover
  if (variant === "desktop") {
    return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl",
        "bg-background/50 border-0",
        "hover:shadow-2xl hover:-translate-y-2",
        "transition-all duration-300 ease-out",
        "w-full aspect-[2/3] max-w-[350px] mx-auto",
        "focus:outline-2 focus:outline-primary focus:outline-offset-4"
      )}
    >
      {/* Container image avec ratio 2:3 */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Image de la marque avec object-fit cover pour remplir tout l'espace */}
        {brandImage ? (
          <img
            src={brandImage}
            alt={brand.name}
            className="w-full h-full object-cover object-center opacity-0 animate-[fadeIn_0.6s_ease_forwards]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-background/5">
            <div className="w-16 h-16 border-2 border-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
              <div className="w-8 h-8 border-2 border-primary/30 rounded-sm"></div>
            </div>
            <div className="text-xs uppercase tracking-wider text-primary/60 font-light">Image à venir</div>
          </div>
        )}
        
        {/* Overlay avec infos marque en bas */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-center">
          <h3 className="font-serif text-xl font-semibold text-[#e8dcc4] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
            {brand.name}
          </h3>
          <p className="text-sm text-primary/90 mb-1.5 font-light">
            Gamme complète disponible
          </p>
          {brand.category && (
            <p className="text-xs text-primary/70 uppercase tracking-wider font-light">
              {brand.category}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
  }

  // Version Mobile : Carousel plein écran avec nom au-dessus et image pleine écran
  return (
    <div className="w-full pb-8">
      {/* Nom de la marque au-dessus - Style élégant */}
      <div className="mb-3 px-4 text-center">
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
        {/* Container image - Hauteur optimisée pour mobile */}
        <div className="relative w-full overflow-hidden h-[calc(100vh-200px)] min-h-[400px] max-h-[500px]">
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


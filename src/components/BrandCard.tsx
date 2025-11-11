import { Brand } from "@/data/perfumes";
import { Button } from "./ui/button";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { contactConfig } from "@/config/contact";

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

  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  return (
    <div
      className="group relative flex flex-col items-center text-center transition-all duration-500"
    >
      {/* Container image style Dior - Fond clair avec stand */}
      <div className="relative w-full mb-6 flex items-center justify-center min-h-[420px] md:min-h-[500px] lg:min-h-[560px] bg-background/20 rounded-sm overflow-hidden">
        {/* Stand décoratif en bas - Style Dior */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-background/50 rounded-t-2xl shadow-sm"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-24 bg-background/30 rounded-t-lg"></div>
        
        {/* Image de la marque - Très grande et centrée */}
        {brandImage && (
          <div className="relative z-10 w-full h-full flex items-end justify-center pb-8 px-4">
            <img
              src={brandImage}
              alt={brand.name}
              className="max-h-[420px] md:max-h-[480px] lg:max-h-[520px] w-auto object-contain opacity-100 group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Badge "Toute la gamme disponible" */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground/70 bg-background/80 backdrop-blur-sm border border-border/20 font-light">
            Toute la gamme disponible
          </span>
        </div>
      </div>

      {/* Informations marque - Style Dior minimaliste */}
      <div className="w-full text-center mb-6">
        <h3 className="font-serif text-lg md:text-xl mb-1 text-foreground/90 group-hover:text-foreground transition-colors duration-300 leading-tight font-light">
          {brand.name}
        </h3>
        <p className="text-xs text-muted-foreground/50 mb-4 font-light">
          {brand.category}
        </p>
        <p className="text-xs text-muted-foreground/50 leading-relaxed font-light max-w-xs mx-auto mb-6">
          Tous les parfums de la collection {brand.name} sont disponibles.
        </p>
      </div>
      
      {/* Boutons contact */}
      <div className="w-full space-y-2 max-w-xs mx-auto">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSnapchat();
          }}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 text-xs rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <SnapchatIcon className="h-4 w-4" />
          Snapchat
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openWhatsApp();
          }}
          variant="outline"
          className="w-full border-border/30 hover:border-primary/40 hover:bg-background/10 h-10 text-xs rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};


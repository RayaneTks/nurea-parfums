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
      className="group relative border border-border/20 hover:border-primary/30 hover:shadow-lg transition-all duration-500 p-6 md:p-8 flex flex-col min-h-[420px] md:min-h-[460px] bg-background/50 hover:bg-background/70"
    >
      {/* Image de la marque - Plus grande et bien visible */}
      {brandImage && (
        <div className="mb-6 h-48 md:h-56 lg:h-64 flex items-center justify-center overflow-hidden bg-background/20 rounded-md p-4">
          <img
            src={brandImage}
            alt={brand.name}
            className="max-h-full max-w-full object-contain opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex-1 mb-6 flex flex-col">
        <h3 className="font-serif text-2xl md:text-3xl mb-3 text-foreground group-hover:text-primary/80 transition-colors duration-300 leading-tight font-light">
          {brand.name}
        </h3>
        <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-4 font-light">
          {brand.category}
        </p>
        <div className="mb-4">
          <span className="inline-block px-3 py-1.5 bg-primary/10 text-primary/80 text-xs uppercase tracking-wider border border-primary/20 font-light">
            Toute la gamme disponible
          </span>
        </div>
        <p className="text-sm text-muted-foreground/50 leading-relaxed font-light mb-6">
          Tous les parfums de la collection {brand.name} sont disponibles. Contactez-nous pour découvrir notre sélection complète.
        </p>
      </div>
      
      <div className="mt-auto pt-6 border-t border-border/20 space-y-3">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSnapchat();
          }}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-xs rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
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
          className="w-full border-border/30 hover:border-primary/40 hover:bg-background/10 h-11 text-xs rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};


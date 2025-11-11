import { Brand } from "@/data/perfumes";
import { Button } from "./ui/button";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { contactConfig } from "@/config/contact";

interface BrandCardProps {
  brand: Brand;
  onClick: () => void;
}

export const BrandCard = ({ brand, onClick }: BrandCardProps) => {
  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  return (
    <div
      className="group relative border-b border-border/15 hover:border-primary/20 transition-all duration-500 py-8 flex flex-col min-h-[260px]"
    >
      <div className="flex-1 mb-6">
        <h3 className="font-serif text-2xl md:text-3xl mb-3 text-foreground group-hover:text-primary/80 transition-colors duration-300 leading-[1.15] font-light">
          {brand.name}
        </h3>
        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.25em] mb-5 font-light">
          {brand.category}
        </p>
        <div className="mb-6">
          <span className="inline-block px-3 py-1.5 bg-primary/5 text-primary/80 text-[8px] uppercase tracking-[0.25em] border border-primary/15 font-light">
            Toute la gamme disponible
          </span>
        </div>
        <p className="text-xs text-muted-foreground/40 leading-relaxed font-light tracking-wide mb-8">
          Tous les parfums de la collection {brand.name} sont disponibles. Contactez-nous pour découvrir notre sélection complète.
        </p>
      </div>
      
      <div className="mt-auto pt-6 border-t border-border/10 space-y-2.5">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSnapchat();
          }}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 text-[10px] rounded-none font-light uppercase tracking-[0.2em] flex items-center justify-center gap-2"
        >
          <SnapchatIcon className="h-3.5 w-3.5" />
          Snapchat
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openWhatsApp();
          }}
          variant="outline"
          className="w-full border-border/20 hover:border-primary/30 hover:bg-background/10 h-10 text-[10px] rounded-none font-light uppercase tracking-[0.2em] flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};


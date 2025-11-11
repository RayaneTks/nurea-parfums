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
      className="group relative border-r border-b border-border/10 hover:bg-background/20 transition-all duration-500 p-6 md:p-8 flex flex-col min-h-[280px] bg-background"
    >
      <div className="flex-1 mb-6">
        <h3 className="font-serif text-xl md:text-2xl lg:text-3xl mb-3 text-foreground group-hover:text-primary/70 transition-colors duration-300 leading-[1.2] font-light">
          {brand.name}
        </h3>
        <p className="text-[8px] text-muted-foreground/25 uppercase tracking-[0.3em] mb-6 font-light">
          {brand.category}
        </p>
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-primary/5 text-primary/70 text-[7px] uppercase tracking-[0.3em] border border-primary/10 font-light">
            Toute la gamme disponible
          </span>
        </div>
        <p className="text-xs text-muted-foreground/35 leading-relaxed font-light tracking-wide mb-8">
          Tous les parfums de la collection {brand.name} sont disponibles. Contactez-nous pour découvrir notre sélection complète.
        </p>
      </div>
      
      <div className="mt-auto pt-6 border-t border-border/5 space-y-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSnapchat();
          }}
          className="w-full bg-primary hover:bg-primary/85 text-primary-foreground h-9 text-[9px] rounded-none font-light uppercase tracking-[0.25em] flex items-center justify-center gap-2"
        >
          <SnapchatIcon className="h-3 w-3" />
          Snapchat
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openWhatsApp();
          }}
          variant="outline"
          className="w-full border-border/15 hover:border-primary/25 hover:bg-background/5 h-9 text-[9px] rounded-none font-light uppercase tracking-[0.25em] flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="h-3 w-3" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};


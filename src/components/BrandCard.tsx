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
      className="group relative bg-background/30 border border-border/30 hover:border-primary/30 transition-all duration-500 p-8 flex flex-col min-h-[320px] hover:bg-background/40"
    >
      <div className="flex-1 mb-8">
        <h3 className="font-serif text-3xl mb-4 text-foreground group-hover:text-primary/90 transition-colors duration-300 leading-[1.1] font-light">
          {brand.name}
        </h3>
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] mb-6 font-light">
          {brand.category}
        </p>
        <div className="mb-6">
          <span className="inline-block px-5 py-2.5 bg-primary/5 text-primary text-[10px] uppercase tracking-[0.2em] border border-primary/20 font-light">
            Toute la gamme disponible
          </span>
        </div>
        <p className="text-sm text-muted-foreground/50 leading-relaxed font-light tracking-wide">
          Tous les parfums de la collection {brand.name} sont disponibles. Contactez-nous pour découvrir notre sélection complète.
        </p>
      </div>
      
      <div className="mt-auto pt-6 border-t border-border/20 space-y-3">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSnapchat();
          }}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-xs rounded-none font-light uppercase tracking-[0.15em] flex items-center justify-center gap-2"
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
          className="w-full border-border/30 hover:border-primary/40 hover:bg-background/20 h-12 text-xs rounded-none font-light uppercase tracking-[0.15em] flex items-center justify-center gap-2"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
};


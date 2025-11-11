import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { contactConfig } from "@/config/contact";
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

interface BrandDrawerProps {
  brand: Brand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const BrandDrawer = ({ brand, open, onOpenChange }: BrandDrawerProps) => {
  if (!brand) return null;

  const brandImage = brandImages[brand.name] || null;

  const openSnapchat = () => {
    window.open(contactConfig.snapchat.url, "_blank");
  };

  const openWhatsApp = () => {
    window.open(contactConfig.whatsapp.url, "_blank");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-t border-border/50 max-h-[90vh] rounded-t-none">
        <DrawerHeader className="text-left border-b border-border/30 pb-6 px-6 pt-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <DrawerTitle className="font-serif text-4xl md:text-5xl text-foreground mb-3 leading-tight font-light">
                {brand.name}
              </DrawerTitle>
              <DrawerDescription className="text-base md:text-lg text-muted-foreground/80 mb-2 font-light">
                {brand.category}
              </DrawerDescription>
              <div className="mt-4">
                <span className="inline-block px-4 py-2 bg-primary/10 text-primary/80 text-xs uppercase tracking-wider border border-primary/20 font-light">
                  Toute la gamme disponible
                </span>
              </div>
            </div>
            <DrawerClose asChild>
              <button className="text-muted-foreground/50 hover:text-foreground transition-colors p-2 -mr-2">
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-6 py-8 overflow-y-auto flex-1">
          {/* Image de la marque en grand */}
          {brandImage && (
            <div className="mb-8 flex items-center justify-center min-h-[300px] md:min-h-[400px] bg-background/20 rounded-sm p-8">
              <img
                src={brandImage}
                alt={brand.name}
                className="max-h-[350px] md:max-h-[450px] w-auto object-contain"
              />
            </div>
          )}

          {/* Description */}
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground/60 leading-relaxed font-light mb-6">
              Tous les parfums de la collection <strong className="text-foreground/80">{brand.name}</strong> sont disponibles. 
              Contactez-nous pour découvrir notre sélection complète et obtenir des informations sur les disponibilités.
            </p>
            <p className="text-xs text-muted-foreground/50 leading-relaxed font-light">
              Nous proposons une gamme complète de parfums {brand.name} en différentes contenances. 
              N'hésitez pas à nous contacter pour plus de détails.
            </p>
          </div>

          {/* Boutons de contact */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-6">
            <Button
              size="lg"
              onClick={openSnapchat}
              className="bg-[#FFFC00] hover:bg-[#FFFC00]/90 text-background h-14 text-base rounded-none px-8 font-light uppercase tracking-wider flex items-center gap-3"
            >
              <SnapchatIcon className="h-5 w-5" />
              Écrire sur Snapchat
            </Button>
            <Button
              size="lg"
              onClick={openWhatsApp}
              className="bg-[#25D366] hover:bg-[#25D366]/90 text-white h-14 text-base rounded-none px-8 font-light uppercase tracking-wider flex items-center gap-3"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Écrire sur WhatsApp
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};


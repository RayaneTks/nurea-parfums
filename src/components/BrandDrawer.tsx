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
import { Brand, perfumes } from "@/data/perfumes";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

// Import des images de marques
import rabanneImage from "@/assets/parfums/complete/RABANNE.png";
import dgImage from "@/assets/parfums/complete/D&G.png";
import jpgImage from "@/assets/parfums/complete/JPG.png";
import azzaroImage from "@/assets/parfums/complete/AZZARO.png";
import guerlainImage from "@/assets/parfums/complete/GUERLAIN.png";
import diorImage from "@/assets/parfums/complete/DIOR.png";
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
  "Guerlain": guerlainImage,
  "Dior": diorImage,
  "Hugo Boss": bossImage,
  "Xerjoff": "", // Pas d'image pour Xerjoff
};

export const BrandDrawer = ({ brand, open, onOpenChange }: BrandDrawerProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  if (!brand) return null;

  const brandImage = brandImages[brand.name] || null;

  // Trouver tous les parfums de cette marque
  const brandPerfumes = useMemo(() => {
    return perfumes.filter((p) => p.brand === brand.name);
  }, [brand.name]);

  const openSnapchat = () => {
    const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par la gamme ${brand.name}`);
    window.open(`${contactConfig.snapchat.url}?text=${message}`, "_blank");
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par la gamme ${brand.name}`);
    window.open(`${contactConfig.whatsapp.url}?text=${message}`, "_blank");
  };

  const handlePerfumeClick = (perfumeId: string, perfumeName: string) => {
    const brandEncoded = encodeURIComponent(brand.name);
    const nameEncoded = encodeURIComponent(perfumeName);
    navigate(`/parfums/${brandEncoded}/${nameEncoded}`);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-t border-border/50 max-h-[90vh] rounded-t-none overflow-y-auto">
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

        <div className="px-6 py-8 overflow-y-auto flex-1 min-h-0">
          {/* Carrousel d'images de la marque */}
          {brandImage && (
            <div className="mb-8">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent>
                  <CarouselItem>
                    <div className="flex items-center justify-center min-h-[250px] md:min-h-[350px] bg-background/20 rounded-sm p-6">
                      <img
                        src={brandImage}
                        alt={brand.name}
                        className="max-h-[250px] md:max-h-[350px] w-auto object-contain"
                      />
                    </div>
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </div>
          )}

          {/* Présentation de la marque */}
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground/70 leading-relaxed font-light mb-4">
              Tous les parfums de la collection <strong className="text-foreground/90">{brand.name}</strong> sont disponibles. 
              Découvrez notre sélection complète et contactez-nous pour obtenir des informations sur les disponibilités et les contenances.
            </p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed font-light">
              Nous proposons une gamme complète de parfums {brand.name} en différentes contenances. 
              N'hésitez pas à nous contacter pour plus de détails et des conseils personnalisés.
            </p>
          </div>

          {/* Liste des parfums de la marque si disponibles */}
          {brandPerfumes.length > 0 && (
            <div className="mb-8">
              <h3 className="font-serif text-xl text-foreground mb-4 font-light">
                Parfums disponibles
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {brandPerfumes.map((perfume) => (
                  <button
                    key={perfume.id}
                    onClick={() => handlePerfumeClick(perfume.id, perfume.name)}
                    className="text-left p-3 border border-border/30 bg-background/50 hover:border-primary/50 hover:bg-background/80 transition-all rounded-sm"
                  >
                    <h4 className="font-serif text-sm text-foreground font-light mb-1">
                      {perfume.name}
                    </h4>
                    {perfume.tags && perfume.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {perfume.tags.slice(0, 1).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-primary/80 uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Boutons de contact */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Button
              size={isMobile ? "default" : "lg"}
              onClick={openSnapchat}
              className={`bg-[#FFFC00] active:bg-[#FFFC00]/90 text-background ${isMobile ? "h-11 text-sm px-6" : "h-14 text-base px-8"} rounded-none font-light uppercase tracking-wider flex items-center gap-2`}
            >
              <SnapchatIcon className={`${isMobile ? "h-4 w-4" : "h-5 w-5"} text-background`} />
              {isMobile ? "Snapchat" : "Écrire sur Snapchat"}
            </Button>
            <Button
              size={isMobile ? "default" : "lg"}
              onClick={openWhatsApp}
              className={`bg-[#25D366] active:bg-[#25D366]/90 text-white ${isMobile ? "h-11 text-sm px-6" : "h-14 text-base px-8"} rounded-none font-light uppercase tracking-wider flex items-center gap-2`}
            >
              <WhatsAppIcon className={`${isMobile ? "h-4 w-4" : "h-5 w-5"} text-white`} />
              {isMobile ? "WhatsApp" : "Écrire sur WhatsApp"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};


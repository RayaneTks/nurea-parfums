import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import {
  Dialog,
  DialogContent,
} from "./ui/dialog";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { SnapchatIcon } from "./icons/SnapchatIcon";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { contactConfig } from "@/config/contact";
import { Brand, perfumes } from "@/data/perfumes";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

// Importer toutes les images de parfums pour les afficher dans la liste
const perfumeImagesModules = import.meta.glob<{ default: string }>(
  "@/assets/parfums/**/*.{png,jpeg,jpg}",
  { eager: true }
);

const perfumeImagesMap = new Map<string, string>();
Object.entries(perfumeImagesModules).forEach(([path, module]) => {
  if (path.includes("/complete/")) {
    return;
  }
  const fileName = path.split("/").pop()?.replace(/\.(png|jpeg|jpg)$/i, "") || "";
  if (module.default) {
    perfumeImagesMap.set(fileName.toLowerCase(), module.default);
  }
});

const getPerfumeImage = (perfumeId: string): string | null => {
  return perfumeImagesMap.get(perfumeId.toLowerCase()) || null;
};

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
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  // Trouver tous les parfums de cette marque - DOIT être appelé avant tout return conditionnel
  const brandPerfumes = useMemo(() => {
    if (!brand) return [];
    return perfumes.filter((p) => p.brand === brand.name);
  }, [brand]);

  if (!brand) return null;

  const brandImage = brandImages[brand.name] || null;

  const openSnapchat = () => {
    const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par la gamme ${brand.name}`);
    window.open(`${contactConfig.snapchat.url}?text=${message}`, "_blank");
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(`Bonjour, je suis intéressé(e) par la gamme ${brand.name}`);
    window.open(`${contactConfig.whatsapp.url}?text=${message}`, "_blank");
  };

  const handlePerfumeClick = (perfume: typeof perfumes[0]) => {
    // S'assurer que le parfum existe dans la liste avant de naviguer
    const perfumeExists = perfumes.some(
      (p) => p.id === perfume.id && p.brand === perfume.brand && p.name === perfume.name
    );
    
    if (!perfumeExists) {
      console.warn('Parfum not found in list:', perfume);
      // Afficher un message ou ne pas naviguer
      return;
    }
    
    const brandEncoded = encodeURIComponent(perfume.brand);
    const nameEncoded = encodeURIComponent(perfume.name);
    navigate(`/parfums/${brandEncoded}/${nameEncoded}`);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-t border-border/50 max-h-[95vh] md:max-h-[90vh] rounded-t-none flex flex-col">
        <DrawerHeader className="text-left border-b border-border/30 pb-4 md:pb-6 px-4 md:px-6 pt-4 md:pt-6 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="font-serif text-2xl md:text-4xl lg:text-5xl text-foreground mb-2 md:mb-3 leading-tight font-light break-words">
                {brand.name}
              </DrawerTitle>
              <DrawerDescription className="text-sm md:text-base lg:text-lg text-muted-foreground/80 mb-2 font-light">
                {brand.category}
              </DrawerDescription>
              <div className="mt-3 md:mt-4">
                <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 text-primary/80 text-[10px] md:text-xs uppercase tracking-wider border border-primary/20 font-light">
                  Toute la gamme disponible
                </span>
              </div>
            </div>
            <DrawerClose asChild>
              <button 
                className="text-muted-foreground/50 hover:text-foreground transition-colors p-2 -mr-2 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm hover:bg-background/50 active:bg-background/70"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 md:px-6 py-4 md:py-8 overflow-y-auto flex-1 min-h-0">
          {/* Carrousel d'images de la marque */}
          {brandImage && (
            <div className="mb-6 md:mb-8">
              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent>
                  <CarouselItem>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsImageModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center min-h-[200px] md:min-h-[300px] lg:min-h-[350px] bg-background/20 rounded-sm p-4 md:p-6 hover:bg-background/30 transition-colors cursor-pointer active:scale-[0.98]"
                      aria-label={`Voir l'image de ${brand.name} en grand`}
                    >
                      <img
                        src={brandImage}
                        alt={brand.name}
                        className="max-h-[200px] md:max-h-[300px] lg:max-h-[350px] w-auto object-contain"
                      />
                    </button>
                  </CarouselItem>
                </CarouselContent>
              </Carousel>
            </div>
          )}

          {/* Présentation de la marque */}
          <div className="mb-6 md:mb-8 text-center max-w-2xl mx-auto">
            <p className="text-xs md:text-sm text-muted-foreground/70 leading-relaxed font-light mb-3 md:mb-4 px-2">
              Tous les parfums de la collection <strong className="text-foreground/90">{brand.name}</strong> sont disponibles. 
              Découvrez notre sélection complète et contactez-nous pour obtenir des informations sur les disponibilités et les contenances.
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground/60 leading-relaxed font-light px-2">
              Nous proposons une gamme complète de parfums {brand.name} en différentes contenances. 
              N'hésitez pas à nous contacter pour plus de détails et des conseils personnalisés.
            </p>
          </div>

          {/* Liste des parfums de la marque si disponibles */}
          {brandPerfumes.length > 0 ? (
            <div className="mb-6 md:mb-8">
              <h3 className="font-serif text-lg md:text-xl text-foreground mb-3 md:mb-4 font-light px-2">
                Parfums disponibles
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3 lg:gap-4">
                {brandPerfumes.map((perfume) => {
                  const perfumeImage = getPerfumeImage(perfume.id);

                  return (
                    <button
                      key={perfume.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePerfumeClick(perfume);
                      }}
                      className="text-left p-2.5 md:p-3 border border-border/30 bg-background/50 hover:border-primary/50 hover:bg-background/80 active:bg-background/90 transition-all rounded-sm group min-h-[44px] w-full"
                    >
                      {perfumeImage && (
                        <div className="mb-2 aspect-[2/3] overflow-hidden rounded-sm bg-background/20">
                          <img
                            src={perfumeImage}
                            alt={perfume.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <h4 className="font-serif text-xs md:text-sm text-foreground font-light mb-1 line-clamp-2 leading-tight">
                        {perfume.name}
                      </h4>
                      {perfume.tags && perfume.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {perfume.tags.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] md:text-[10px] text-primary/80 uppercase tracking-wider"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] md:text-xs text-muted-foreground/60 mt-1 font-light">
                        Voir détails →
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-6 md:mb-8 text-center">
              <p className="text-xs md:text-sm text-muted-foreground/70 leading-relaxed font-light mb-3 md:mb-4 px-2">
                Tous les parfums de la collection <strong className="text-foreground/90">{brand.name}</strong> sont disponibles en différentes contenances.
              </p>
              <p className="text-[10px] md:text-xs text-muted-foreground/60 leading-relaxed font-light px-2">
                Contactez-nous pour obtenir la liste complète des parfums disponibles et leurs prix.
              </p>
            </div>
          )}

          {/* Boutons de contact */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pb-2 md:pb-0 flex-shrink-0">
            <Button
              size={isMobile ? "default" : "lg"}
              onClick={openSnapchat}
              className={`bg-[#FFFC00] active:bg-[#FFFC00]/90 text-background ${isMobile ? "h-11 text-sm px-6 min-h-[44px]" : "h-14 text-base px-8"} rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto`}
            >
              <SnapchatIcon className={`${isMobile ? "h-4 w-4" : "h-5 w-5"} text-background`} />
              {isMobile ? "Snapchat" : "Écrire sur Snapchat"}
            </Button>
            <Button
              size={isMobile ? "default" : "lg"}
              onClick={openWhatsApp}
              className={`bg-[#25D366] active:bg-[#25D366]/90 text-white ${isMobile ? "h-11 text-sm px-6 min-h-[44px]" : "h-14 text-base px-8"} rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2 w-full sm:w-auto`}
            >
              <WhatsAppIcon className={`${isMobile ? "h-4 w-4" : "h-5 w-5"} text-white`} />
              {isMobile ? "WhatsApp" : "Écrire sur WhatsApp"}
            </Button>
          </div>
        </div>
      </DrawerContent>

      {/* Modal pour afficher l'image en grand */}
      {brandImage && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent 
            className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-transparent border-0 shadow-none [&>button]:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            style={{ zIndex: 300 }}
          >
            <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute right-2 top-2 md:right-4 md:top-4 z-[310] rounded-full bg-background/95 hover:bg-background p-2 md:p-3 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors shadow-lg border border-border/50"
                aria-label="Fermer"
                style={{ zIndex: 310 }}
              >
                <X className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
              </button>
              <img
                src={brandImage}
                alt={brand.name}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Drawer>
  );
};

import { useParams, useNavigate } from "react-router-dom";
import { perfumes, fullRangeBrands } from "@/data/perfumes";
import { Button } from "@/components/ui/button";
import { SnapchatIcon } from "@/components/icons/SnapchatIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { contactConfig } from "@/config/contact";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useMemo, useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

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

export const BrandDetail = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Scroll vers le haut quand on arrive sur la page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [brandId]);

  const brand = useMemo(() => {
    if (!brandId) return null;
    return fullRangeBrands.find((b) => b.id === brandId);
  }, [brandId]);

  // Trouver tous les parfums de cette marque
  const brandPerfumes = useMemo(() => {
    if (!brand) return [];
    return perfumes.filter((p) => p.brand === brand.name);
  }, [brand?.name]);

  if (!brand) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl mb-4">Marque non trouvée</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

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
      return;
    }
    
    const brandEncoded = encodeURIComponent(perfume.brand);
    const nameEncoded = encodeURIComponent(perfume.name);
    navigate(`/parfums/${brandEncoded}/${nameEncoded}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Bouton retour */}
        <Button
          onClick={() => navigate("/", { state: { scrollToCatalogue: true } })}
          variant="ghost"
          className="mb-6 md:mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au catalogue
        </Button>

        {/* Header de la marque */}
        <div className="mb-8 md:mb-12">
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl text-foreground mb-3 md:mb-4 leading-tight font-light">
            {brand.name}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-muted-foreground/80 mb-4 md:mb-6 font-light">
            {brand.category}
          </p>
          <div className="inline-block px-4 md:px-6 py-2 md:py-3 bg-primary/10 text-primary/80 text-xs md:text-sm uppercase tracking-wider border border-primary/20 font-light">
            Toute la gamme disponible
          </div>
        </div>

        {/* Carrousel d'images de la marque */}
        {brandImage && (
          <div className="mb-8 md:mb-12">
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
                    className="w-full flex items-center justify-center min-h-[300px] md:min-h-[400px] lg:min-h-[500px] bg-background/20 rounded-lg p-6 md:p-8 hover:bg-background/30 transition-colors cursor-pointer active:scale-[0.98]"
                    aria-label={`Voir l'image de ${brand.name} en grand`}
                  >
                    <img
                      src={brandImage}
                      alt={brand.name}
                      className="max-h-[300px] md:max-h-[400px] lg:max-h-[500px] w-auto object-contain"
                    />
                  </button>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          </div>
        )}

        {/* Présentation de la marque */}
        <div className="mb-8 md:mb-12 text-center max-w-3xl mx-auto">
          <p className="text-sm md:text-base text-muted-foreground/70 leading-relaxed font-light mb-4 md:mb-6">
            Tous les parfums de la collection <strong className="text-foreground/90">{brand.name}</strong> sont disponibles. 
            Découvrez notre sélection complète et contactez-nous pour obtenir des informations sur les disponibilités et les contenances.
          </p>
          <p className="text-xs md:text-sm text-muted-foreground/60 leading-relaxed font-light">
            Nous proposons une gamme complète de parfums {brand.name} en différentes contenances. 
            N'hésitez pas à nous contacter pour plus de détails et des conseils personnalisés.
          </p>
        </div>

        {/* Liste des parfums de la marque si disponibles */}
        {brandPerfumes.length > 0 ? (
          <div className="mb-8 md:mb-12">
            <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-6 md:mb-8 font-light">
              Parfums disponibles
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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
                    className="text-left p-4 md:p-5 border border-border/30 bg-background/50 hover:border-primary/50 hover:bg-background/80 active:bg-background/90 transition-all rounded-lg group min-h-[44px] w-full"
                  >
                    {perfumeImage && (
                      <div className="mb-3 md:mb-4 aspect-[2/3] overflow-hidden rounded-lg bg-background/20">
                        <img
                          src={perfumeImage}
                          alt={perfume.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <h3 className="font-serif text-sm md:text-base text-foreground font-light mb-2 line-clamp-2 leading-tight">
                      {perfume.name}
                    </h3>
                    {perfume.tags && perfume.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {perfume.tags.slice(0, 1).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] md:text-xs text-primary/80 uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs md:text-sm text-muted-foreground/60 mt-2 font-light">
                      Voir détails →
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8 md:mb-12 text-center">
            <p className="text-sm md:text-base text-muted-foreground/70 leading-relaxed font-light mb-4 md:mb-6">
              Tous les parfums de la collection <strong className="text-foreground/90">{brand.name}</strong> sont disponibles en différentes contenances.
            </p>
            <p className="text-xs md:text-sm text-muted-foreground/60 leading-relaxed font-light">
              Contactez-nous pour obtenir la liste complète des parfums disponibles et leurs prix.
            </p>
          </div>
        )}

        {/* Boutons de contact */}
        <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center max-w-2xl mx-auto pb-8 md:pb-12">
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
      </main>

      <Footer />

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
    </div>
  );
};


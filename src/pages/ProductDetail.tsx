import { useParams, useNavigate } from "react-router-dom";
import { perfumes } from "@/data/perfumes";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SnapchatIcon } from "@/components/icons/SnapchatIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { contactConfig } from "@/config/contact";
import { defaultSizes } from "@/data/perfumes";
import { ArrowLeft, Share2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

// Importer toutes les images de parfums (support .png, .jpeg, .jpg)
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

export const ProductDetail = () => {
  const { brand, name } = useParams<{ brand: string; name: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [imageError, setImageError] = useState(false);

  // Scroll vers le haut quand on arrive sur la page (sauf si on vient du catalogue)
  useEffect(() => {
    // Ne pas scroller si on vient du catalogue (la position sera restaurée au retour)
    const savedScrollPosition = sessionStorage.getItem('catalogueScrollPosition');
    if (!savedScrollPosition) {
      window.scrollTo(0, 0);
    }
  }, [brand, name]);

  const perfume = useMemo(() => {
    if (!brand || !name) return null;
    
    try {
      const perfumeName = decodeURIComponent(name).trim();
      const brandName = decodeURIComponent(brand).trim();
      
      // Log pour débogage
      console.log('Recherche parfum:', { perfumeName, brandName });
      
      // Recherche exacte d'abord
      let found = perfumes.find(
        (p) =>
          p.name.toLowerCase().trim() === perfumeName.toLowerCase() &&
          p.brand.toLowerCase().trim() === brandName.toLowerCase()
      );
      
      // Si pas trouvé, recherche plus flexible (gère les espaces multiples, etc.)
      if (!found) {
        found = perfumes.find(
          (p) =>
            p.name.toLowerCase().replace(/\s+/g, ' ').trim() === perfumeName.toLowerCase().replace(/\s+/g, ' ').trim() &&
            p.brand.toLowerCase().replace(/\s+/g, ' ').trim() === brandName.toLowerCase().replace(/\s+/g, ' ').trim()
        );
      }
      
      // Si toujours pas trouvé, recherche par ID si disponible dans l'URL
      if (!found && name.includes('-')) {
        const possibleId = name.toLowerCase();
        found = perfumes.find((p) => p.id.toLowerCase() === possibleId);
      }
      
      // Si toujours pas trouvé, recherche partielle par nom
      if (!found) {
        found = perfumes.find(
          (p) =>
            p.name.toLowerCase().includes(perfumeName.toLowerCase()) &&
            p.brand.toLowerCase().trim() === brandName.toLowerCase()
        );
      }
      
      if (!found) {
        console.warn('Parfum non trouvé:', { 
          searchedName: perfumeName, 
          searchedBrand: brandName,
          availablePerfumesForBrand: perfumes.filter(p => p.brand.toLowerCase() === brandName.toLowerCase()).map(p => ({ id: p.id, name: p.name }))
        });
      }
      
      return found || null;
    } catch (error) {
      console.error('Error decoding URL parameters:', error);
      return null;
    }
  }, [brand, name]);

  if (!perfume) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl mb-4">Produit non trouvé</h1>
          <Button onClick={() => navigate("/")} variant="outline">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const perfumeImage = getPerfumeImage(perfume.id);
  const sizes = perfume.availableSizes || defaultSizes;

  const openSnapchat = () => {
    const message = encodeURIComponent(
      `Bonjour, je suis intéressé(e) par ${perfume.name} de ${perfume.brand}${selectedSize ? ` en ${selectedSize}ml` : ""}`
    );
    window.open(`${contactConfig.snapchat.url}?text=${message}`, "_blank");
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour, je suis intéressé(e) par ${perfume.name} de ${perfume.brand}${selectedSize ? ` en ${selectedSize}ml` : ""}`
    );
    window.open(`${contactConfig.whatsapp.url}?text=${message}`, "_blank");
  };

  const shareProduct = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${perfume.name} - ${perfume.brand}`,
          text: `Découvrez ${perfume.name} de ${perfume.brand} sur Nuréa Parfums`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert("Lien copié dans le presse-papiers");
    }
  };

  // Produits similaires (même marque ou même catégorie)
  const similarPerfumes = perfumes
    .filter(
      (p) =>
        p.id !== perfume.id &&
        (p.brand === perfume.brand || p.category === perfume.category)
    )
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Header sticky avec retour */}
      <div className="sticky top-[56px] md:top-[64px] z-40 bg-background/98 backdrop-blur-md border-b border-border/20">
        <div className="container mx-auto px-4 py-2 md:py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigate("/", { state: { scrollToCatalogue: true } });
            }}
            className="font-light min-h-[44px] md:min-h-[36px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={shareProduct}
            className="h-11 w-11 md:h-9 md:w-9"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-4 md:py-6">
        <div className="grid md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
          {/* Image produit - plus compacte sur mobile */}
          <div className="relative">
            <div className="relative w-full aspect-[3/4] md:aspect-[2/3] overflow-hidden bg-background/5 rounded-xl">
              {perfumeImage && !imageError ? (
                <div className="w-full h-full p-2 md:p-4">
                  <img
                    src={perfumeImage}
                    alt={perfume.name}
                    className="w-full h-full object-contain object-center"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-background/5">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-primary/20 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3 opacity-50">
                    <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-primary/30 rounded-sm"></div>
                  </div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider text-primary/60 font-light">
                    Image à venir
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informations produit */}
          <div className="flex flex-col">
            {/* Tags */}
            {perfume.tags && perfume.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 md:mb-3">
                {perfume.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-primary/10 text-primary/90 border border-primary/20 text-[10px] md:text-xs font-light uppercase tracking-wider px-1.5 py-0.5"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Nom et marque */}
            <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground mb-1 md:mb-2 leading-tight font-light">
              {perfume.name}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground/80 mb-1 font-light">
              {perfume.brand}
            </p>
            {perfume.category && (
              <p className="text-[10px] md:text-xs text-muted-foreground/60 uppercase tracking-wider mb-2 md:mb-3 font-light">
                {perfume.category}
              </p>
            )}

            {/* Prix */}
            <div className="mb-3 md:mb-4">
              {perfume.price ? (
                <p className="text-lg md:text-xl font-medium text-foreground">
                  {perfume.price}
                </p>
              ) : (
                <p className="text-sm md:text-base text-muted-foreground/70 font-light">
                  Demander le prix
                </p>
              )}
            </div>

            {/* Contenances */}
            <div className="mb-4 md:mb-6">
              <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground/70 mb-2 md:mb-3 font-light">
                Contenances disponibles
              </h3>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 md:px-4 py-1.5 md:py-2 border text-[11px] md:text-sm font-light transition-all duration-300 min-w-[60px] md:min-w-[80px] text-center ${
                      selectedSize === size
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/50 text-foreground"
                    }`}
                  >
                    {size} ml
                  </button>
                ))}
              </div>
            </div>

            {/* Description compacte */}
            <div className="mb-4 md:mb-6 border-t border-b border-border/30 py-3 md:py-4">
              <p className="text-[11px] md:text-xs text-muted-foreground/80 leading-relaxed font-light">
                Contactez-nous pour disponibilité, conseils et options de contenances.
                Nous vous répondrons rapidement avec toutes les informations nécessaires.
              </p>
            </div>


            {/* CTA sticky bottom sur mobile */}
            {isMobile ? (
              <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-t border-border/30 p-3 shadow-lg">
                <div className="flex gap-3">
                  <Button
                    onClick={openSnapchat}
                    className="flex-1 bg-[#FFFC00] active:bg-[#FFFC00]/90 text-background min-h-[44px] text-sm rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <SnapchatIcon className="h-4 w-4 text-background" />
                    Snapchat
                  </Button>
                  <Button
                    onClick={openWhatsApp}
                    className="flex-1 bg-[#25D366] active:bg-[#25D366]/90 text-white min-h-[44px] text-sm rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-white" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                <Button
                  onClick={openSnapchat}
                  className="w-full bg-[#FFFC00] hover:bg-[#FFFC00]/90 text-background h-12 md:h-14 text-sm md:text-base rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2 md:gap-3"
                  size="lg"
                >
                  <SnapchatIcon className="h-4 w-4 md:h-5 md:w-5 text-background" />
                  Écrire sur Snapchat
                </Button>
                <Button
                  onClick={openWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white h-12 md:h-14 text-sm md:text-base rounded-none font-light uppercase tracking-wider flex items-center justify-center gap-2 md:gap-3"
                  size="lg"
                >
                  <WhatsAppIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  Écrire sur WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Produits similaires */}
        {similarPerfumes.length > 0 && (
          <div className="mt-6 md:mt-8 border-t border-border/30 pt-6 md:pt-8">
            <h2 className="font-serif text-xl md:text-2xl text-foreground mb-4 md:mb-6 font-light">
              Produits similaires
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {similarPerfumes.map((similar) => {
                const similarImage = getPerfumeImage(similar.id);
                return (
                  <button
                    key={similar.id}
                    onClick={() =>
                      navigate(
                        `/parfums/${encodeURIComponent(similar.brand)}/${encodeURIComponent(similar.name)}`
                      )
                    }
                    className="text-center group w-full"
                  >
                    <div className="relative w-full aspect-[2/3] overflow-hidden bg-background/5 rounded-xl mb-2">
                      {similarImage ? (
                        <div className="w-full h-full p-1.5 md:p-2">
                          <img
                            src={similarImage}
                            alt={similar.name}
                            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-primary/30">
                          <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-primary/20 rounded-full flex items-center justify-center opacity-50">
                            <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-primary/30 rounded-sm"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <h3 className="font-serif text-sm md:text-base text-foreground font-light mb-0.5 text-center line-clamp-1">
                      {similar.name}
                    </h3>
                    <p className="text-[11px] md:text-xs text-muted-foreground/80 font-light text-center line-clamp-1">
                      {similar.brand}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Spacer pour le CTA sticky mobile */}
      {isMobile && <div className="h-24"></div>}
      <Footer />
    </div>
  );
};


import { Perfume, defaultSizes, allBrands } from "@/data/perfumes";
import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
  variant?: "desktop" | "mobile";
  isDetailsOpen?: boolean;
  onDetailsToggle?: (perfumeId: string) => void;
}

// Importer toutes les images de parfums individuels disponibles
// Supporte .png, .jpeg, .jpg
// Les images doivent être dans src/assets/parfums/ (pas dans complete/)
// Note: Les fichiers doivent être nommés selon l'ID du parfum (ex: "creed-aventus.png")
const perfumeImagesModules = import.meta.glob<{ default: string }>(
  "@/assets/parfums/**/*.{png,jpeg,jpg}",
  { eager: true }
);

// Créer un mapping des IDs de parfums vers les URLs d'images
// Exclure les fichiers dans le dossier "complete"
const perfumeImagesMap = new Map<string, string>();
Object.entries(perfumeImagesModules).forEach(([path, module]) => {
  // Ignorer les fichiers dans le dossier "complete"
  if (path.includes("/complete/")) {
    return;
  }
  
  // Extraire le nom du fichier sans l'extension
  const fileName = path.split("/").pop()?.replace(/\.(png|jpeg|jpg)$/i, "") || "";
  if (module.default) {
    perfumeImagesMap.set(fileName.toLowerCase(), module.default);
  }
});

// Fonction pour obtenir l'image d'un parfum
const getPerfumeImage = (perfumeId: string): string | null => {
  return perfumeImagesMap.get(perfumeId.toLowerCase()) || null;
};

export const PerfumeCard = ({ perfume, onClick, variant = "desktop", isDetailsOpen = false, onDetailsToggle }: PerfumeCardProps) => {
  const [imageError, setImageError] = useState(false);
  const isMobile = useIsMobile();
  const perfumeImage = useMemo(() => getPerfumeImage(perfume.id), [perfume.id]);
  
  const showDetails = isDetailsOpen;
  
  // Vérifier si la catégorie est une marque (ne pas l'afficher si c'est le cas)
  const shouldShowCategory = useMemo(() => {
    if (!perfume.category) return false;
    // Si la catégorie correspond à une marque, ne pas l'afficher
    return !allBrands.includes(perfume.category);
  }, [perfume.category]);
  
  const handleCardClick = () => {
    if (variant === "mobile" && isMobile) {
      // Sur mobile, premier clic montre les détails, deuxième clic navigue
      if (!showDetails) {
        onDetailsToggle?.(perfume.id);
      } else {
        onClick();
      }
    } else {
      // Sur desktop, clic direct navigue
      onClick();
    }
  };
  
  const handleCloseDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetailsToggle?.(perfume.id);
  };

  // Version Desktop : Card avec ratio 2:3 et hover pour afficher les détails
  if (variant === "desktop") {
    const sizes = perfume.availableSizes || defaultSizes;
    return (
      <Card
        onClick={onClick}
        className={cn(
          "group relative cursor-pointer overflow-hidden",
          "bg-background/50 border-0 rounded-xl",
          "hover:shadow-2xl hover:-translate-y-2",
          "transition-all duration-300 ease-out",
          "w-full aspect-[2/3] max-w-[350px] mx-auto",
          "focus:outline-2 focus:outline-primary focus:outline-offset-4"
        )}
      >
        {/* Container image avec ratio 2:3 */}
        <div className="relative w-full h-full overflow-hidden">
          {/* Image du parfum avec object-fit contain pour voir l'image entière */}
          {perfumeImage && !imageError ? (
            <div className="w-full h-full">
              <img
                src={perfumeImage}
                alt={perfume.name}
                className={cn(
                  "w-full h-full object-cover object-center opacity-0 animate-[fadeIn_0.6s_ease_forwards]",
                  "group-hover:blur-sm group-hover:scale-105 transition-all duration-300"
                )}
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-background/5 border-2 border-dashed border-primary/30">
              <div className="w-16 h-16 border-2 border-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
                <div className="w-8 h-8 border-2 border-primary/30 rounded-sm"></div>
              </div>
              <div className="text-xs uppercase tracking-wider text-primary/60 font-light">Image à venir</div>
            </div>
          )}
          
          {/* Overlay avec infos produit en bas - toujours visible */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-center">
            <h3 className="font-serif text-lg font-semibold text-[#e8dcc4] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
              {perfume.name}
            </h3>
            <p className="text-xs text-primary/90 mb-1.5 font-light line-clamp-1">
              {perfume.brand}
            </p>
            {shouldShowCategory && (
              <span className="inline-block px-2 py-0.5 bg-primary/20 border border-primary/40 rounded-lg text-[10px] text-primary uppercase tracking-wider font-light">
                {perfume.category}
              </span>
            )}
          </div>

          {/* Overlay détails au hover - prix, tailles, etc. */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4 text-center">
            <h3 className="font-serif text-xl font-semibold text-[#e8dcc4] mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {perfume.name}
            </h3>
            <p className="text-sm text-primary/90 mb-3 font-light">
              {perfume.brand}
            </p>
            {perfume.price ? (
              <p className="text-lg font-medium text-foreground mb-4">
                {perfume.price}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/70 mb-4 font-light">
                Demander le prix
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {sizes.slice(0, 3).map((size) => (
                <Badge key={size} className="bg-primary/20 text-primary border border-primary/40 text-xs">
                  {size}ml
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Version Mobile : Card avec ratio 2:3 - premier clic montre détails, deuxième clic navigue
  const sizes = perfume.availableSizes || defaultSizes;

  return (
    <Card
      onClick={handleCardClick}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl",
        "bg-background border-0",
        "active:scale-[0.98] transition-all duration-200",
        "w-full aspect-[2/3]",
        "shadow-md hover:shadow-lg",
        "focus:outline-2 focus:outline-primary focus:outline-offset-4"
      )}
    >
      {/* Image produit - Ratio 2:3 avec object-fit cover pour remplir tout l'espace */}
      <div className="relative w-full h-full overflow-hidden">
        {perfumeImage && !imageError ? (
          <img
            src={perfumeImage}
            alt={perfume.name}
            className={cn(
              "w-full h-full object-cover object-center opacity-0 animate-[fadeIn_0.6s_ease_forwards] transition-all duration-300",
              showDetails && "blur-sm scale-105"
            )}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-primary/30 bg-background/5">
            <div className="w-12 h-12 border-2 border-primary/20 rounded-full flex items-center justify-center mx-auto mb-2 opacity-50">
              <div className="w-6 h-6 border-2 border-primary/30 rounded-sm"></div>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-primary/60 font-light px-2 text-center">Image à venir</div>
          </div>
        )}
        
        {/* Overlay avec infos produit en bas - toujours visible */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-center transition-opacity duration-300",
          showDetails && "opacity-0"
        )}>
          <h3 className="font-serif text-sm font-semibold text-[#e8dcc4] mb-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
            {perfume.name}
          </h3>
          <p className="text-[10px] text-primary/90 mb-1 font-light line-clamp-1">
            {perfume.brand}
          </p>
          {shouldShowCategory && (
            <span className="inline-block px-1.5 py-0.5 bg-primary/20 border border-primary/40 rounded text-[9px] text-primary uppercase tracking-wider font-light">
              {perfume.category}
            </span>
          )}
        </div>

        {/* Overlay détails au clic sur mobile - prix, tailles, CTA */}
        {showDetails && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20 animate-[fadeIn_0.3s_ease_forwards]">
            <h3 className="font-serif text-lg font-semibold text-[#e8dcc4] mb-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {perfume.name}
            </h3>
            <p className="text-xs text-primary/90 mb-2 font-light">
              {perfume.brand}
            </p>
            {perfume.price ? (
              <p className="text-base font-medium text-foreground mb-3">
                {perfume.price}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/70 mb-3 font-light">
                Demander le prix
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {sizes.slice(0, 3).map((size) => (
                <Badge key={size} className="bg-primary/20 text-primary border border-primary/40 text-[10px] px-2 py-0.5">
                  {size}ml
                </Badge>
              ))}
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="w-full bg-primary/20 text-primary border border-primary/40 min-h-[44px] text-xs rounded-none font-light uppercase"
            >
              Voir détails
            </Button>
            <button
              onClick={handleCloseDetails}
              className="mt-3 text-[10px] text-muted-foreground/60 font-light underline"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

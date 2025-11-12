import { Perfume } from "@/data/perfumes";
import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
  variant?: "desktop" | "mobile";
}

// Importer toutes les images de parfums individuels disponibles
// Les images doivent être dans src/assets/parfums/ (pas dans complete/)
// Note: Les fichiers doivent être nommés selon l'ID du parfum (ex: "creed-aventus.png")
const perfumeImagesModules = import.meta.glob<{ default: string }>(
  "@/assets/parfums/**/*.png",
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
  const fileName = path.split("/").pop()?.replace(".png", "") || "";
  if (module.default) {
    perfumeImagesMap.set(fileName.toLowerCase(), module.default);
  }
});

// Fonction pour obtenir l'image d'un parfum
const getPerfumeImage = (perfumeId: string): string | null => {
  return perfumeImagesMap.get(perfumeId.toLowerCase()) || null;
};

export const PerfumeCard = ({ perfume, onClick, variant = "desktop" }: PerfumeCardProps) => {
  const [imageError, setImageError] = useState(false);
  const perfumeImage = useMemo(() => getPerfumeImage(perfume.id), [perfume.id]);

  // Version Desktop : Card avec hover effect, nom visible au survol
  if (variant === "desktop") {
    return (
      <Card
        onClick={onClick}
        className={cn(
          "group relative cursor-pointer overflow-hidden",
          "bg-background/50 border-border/20",
          "hover:border-border/50 hover:shadow-xl",
          "transition-all duration-500 ease-out",
          "h-full flex flex-col",
          "min-h-[500px] lg:min-h-[600px]"
        )}
      >
        {/* Container image - Grande hauteur - Image remplit complètement */}
        <div className="relative w-full flex-1 overflow-hidden min-h-[450px] lg:min-h-[550px]">
          {/* Image du parfum */}
          {perfumeImage && !imageError ? (
            <img
              src={perfumeImage}
              alt={perfume.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background/5">
              <div className="text-center">
                <div className="w-16 h-16 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 border border-muted-foreground/15 rounded-sm"></div>
                </div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground/20 font-light">Image à venir</div>
              </div>
            </div>
          )}
          
          {/* Overlay avec nom au survol */}
          <div className="absolute inset-0 bg-background/85 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center z-10">
            <div className="text-center px-6 py-8">
              <h3 className="font-serif text-2xl lg:text-3xl text-foreground font-light leading-tight mb-2">
                {perfume.name}
              </h3>
              <p className="text-base text-muted-foreground/90 font-light">
                {perfume.brand}
              </p>
              {perfume.category && (
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-2 font-light">
                  {perfume.category}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Version Mobile : Nom au-dessus, carte pleine largeur - Image agrandie
  return (
    <div className="w-full pb-20">
      {/* Nom du parfum au-dessus - Compact */}
      <div className="mb-2 px-2 text-center">
        <h3 className="font-serif text-base text-foreground font-light leading-tight mb-0.5">
          {perfume.name}
        </h3>
        <p className="text-[11px] text-muted-foreground/70 font-light">
          {perfume.brand}
        </p>
        {perfume.category && (
          <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider font-light mt-0.5">
            {perfume.category}
          </p>
        )}
      </div>

      {/* Card avec image - Image agrandie */}
      <Card
        onClick={onClick}
        className={cn(
          "relative cursor-pointer overflow-hidden",
          "bg-background/50 border-border/30",
          "active:scale-[0.98] transition-transform duration-200",
          "w-full shadow-md"
        )}
      >
        {/* Container image - Image agrandie pour mobile */}
        <div className="relative w-full overflow-hidden h-[calc(100vh-200px)] min-h-[400px] max-h-[500px]">
          {/* Image du parfum */}
          {perfumeImage && !imageError ? (
            <img
              src={perfumeImage}
              alt={perfume.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background/5">
              <div className="text-center">
                <div className="w-12 h-12 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-6 h-6 border border-muted-foreground/15 rounded-sm"></div>
                </div>
                <div className="text-[8px] uppercase tracking-wider text-muted-foreground/20 font-light">Image à venir</div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

import { Perfume } from "@/data/perfumes";
import { useState, useMemo } from "react";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
}

// Importer toutes les images de parfums disponibles
// Les images doivent être dans src/assets/parfums/ (pas dans complete/)
// Note: Les fichiers doivent être nommés selon l'ID du parfum (ex: "creed-aventus.png")
const perfumeImagesModules = import.meta.glob<{ default: string }>(
  "@/assets/parfums/*.png",
  { eager: true }
);

// Créer un mapping des IDs de parfums vers les URLs d'images
const perfumeImagesMap = new Map<string, string>();
Object.entries(perfumeImagesModules).forEach(([path, module]) => {
  // Extraire le nom du fichier sans l'extension et le chemin
  const fileName = path.split("/").pop()?.replace(".png", "") || "";
  if (module.default) {
    perfumeImagesMap.set(fileName.toLowerCase(), module.default);
  }
});

// Fonction pour obtenir l'image d'un parfum
const getPerfumeImage = (perfumeId: string): string | null => {
  return perfumeImagesMap.get(perfumeId.toLowerCase()) || null;
};

export const PerfumeCard = ({ perfume, onClick }: PerfumeCardProps) => {
  const [imageError, setImageError] = useState(false);
  const perfumeImage = useMemo(() => getPerfumeImage(perfume.id), [perfume.id]);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer border-r border-b border-border/10 hover:bg-background/20 transition-all duration-500 p-6 md:p-8 flex flex-col min-h-[220px] bg-background"
    >
      {/* Image du parfum */}
      {perfumeImage && !imageError && (
        <div className="mb-6 h-32 md:h-40 flex items-center justify-center overflow-hidden bg-background/30 rounded-sm">
          <img
            src={perfumeImage}
            alt={perfume.name}
            className="max-h-full max-w-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {perfume.tags && perfume.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {perfume.tags.map((tag) => (
            <span
              key={tag}
              className="text-[7px] uppercase tracking-[0.3em] text-primary/50 font-light"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex-1">
        <h3 className="font-serif text-xl md:text-2xl lg:text-3xl mb-3 text-foreground group-hover:text-primary/70 transition-colors duration-300 leading-[1.2] font-light">
          {perfume.name}
        </h3>
        <p className="text-xs text-muted-foreground/45 mb-4 font-light tracking-wide">
          {perfume.brand}
        </p>
        <p className="text-[8px] text-muted-foreground/25 uppercase tracking-[0.3em] mt-6 font-light">
          {perfume.category}
        </p>
      </div>
    </div>
  );
};

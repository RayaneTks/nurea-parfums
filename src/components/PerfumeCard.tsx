import { Perfume } from "@/data/perfumes";
import { useState, useMemo } from "react";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
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

export const PerfumeCard = ({ perfume, onClick }: PerfumeCardProps) => {
  const [imageError, setImageError] = useState(false);
  const perfumeImage = useMemo(() => getPerfumeImage(perfume.id), [perfume.id]);

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer border border-border/20 hover:border-primary/30 hover:shadow-lg transition-all duration-500 p-6 md:p-8 flex flex-col min-h-[380px] md:min-h-[420px] bg-background/50 hover:bg-background/70"
    >
      {/* Image du parfum - Plus grande et bien visible */}
      <div className="mb-6 h-48 md:h-56 lg:h-64 flex items-center justify-center overflow-hidden bg-background/20 rounded-md p-4">
        {perfumeImage && !imageError ? (
          <img
            src={perfumeImage}
            alt={perfume.name}
            className="max-h-full max-w-full object-contain opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/10">
            <div className="text-center">
              <div className="w-16 h-16 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-8 h-8 border border-muted-foreground/20 rounded-sm"></div>
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground/30 font-light">Image à venir</div>
            </div>
          </div>
        )}
      </div>

      {/* Tags */}
      {perfume.tags && perfume.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {perfume.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs uppercase tracking-wider text-primary/70 bg-primary/5 border border-primary/10 font-light"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Informations */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-serif text-2xl md:text-3xl mb-2 text-foreground group-hover:text-primary/80 transition-colors duration-300 leading-tight font-light">
          {perfume.name}
        </h3>
        <p className="text-sm text-muted-foreground/60 mb-3 font-light">
          {perfume.brand}
        </p>
        <p className="text-xs text-muted-foreground/40 uppercase tracking-wider mt-auto font-light">
          {perfume.category}
        </p>
      </div>
    </div>
  );
};

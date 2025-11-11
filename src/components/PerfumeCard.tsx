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
      className="group relative cursor-pointer flex flex-col items-center text-center transition-all duration-500"
    >
      {/* Container image style Dior - Fond clair avec stand */}
      <div className="relative w-full mb-6 flex items-center justify-center min-h-[420px] md:min-h-[500px] lg:min-h-[560px] bg-background/20 rounded-sm overflow-hidden">
        {/* Stand décoratif en bas - Style Dior */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-background/50 rounded-t-2xl shadow-sm"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-24 bg-background/30 rounded-t-lg"></div>
        
        {/* Image du parfum - Très grande et centrée */}
        <div className="relative z-10 w-full h-full flex items-end justify-center pb-8 px-4">
          {perfumeImage && !imageError ? (
            <img
              src={perfumeImage}
              alt={perfume.name}
              className="max-h-[420px] md:max-h-[480px] lg:max-h-[520px] w-auto object-contain opacity-100 group-hover:scale-105 transition-transform duration-500"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 border-2 border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-12 h-12 border border-muted-foreground/20 rounded-sm"></div>
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground/30 font-light">Image à venir</div>
              </div>
            </div>
          )}
        </div>

        {/* Tags/Badges en overlay (optionnel) */}
        {perfume.tags && perfume.tags.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {perfume.tags.map((tag, index) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground/70 bg-background/80 backdrop-blur-sm border border-border/20 font-light"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Informations produit - Style Dior minimaliste */}
      <div className="w-full text-center">
        <h3 className="font-serif text-lg md:text-xl mb-1 text-foreground/90 group-hover:text-foreground transition-colors duration-300 leading-tight font-light">
          {perfume.name}
        </h3>
        <p className="text-xs text-muted-foreground/50 mb-2 font-light">
          {perfume.brand}
        </p>
        {perfume.category !== "Tous" && (
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider font-light">
            {perfume.category}
          </p>
        )}
      </div>
    </div>
  );
};

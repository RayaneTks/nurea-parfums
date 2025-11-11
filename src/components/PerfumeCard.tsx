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
      className="group relative cursor-pointer flex flex-col transition-all duration-500"
    >
      {/* Container image - Pleine largeur, design premium */}
      <div className="relative w-full aspect-[2/3] md:aspect-[3/4] flex items-end justify-center bg-background/5 overflow-hidden">
        {/* Image du parfum - Prend maximum d'espace */}
        {perfumeImage && !imageError ? (
          <img
            src={perfumeImage}
            alt={perfume.name}
            className="w-full h-[90%] object-contain object-bottom p-4 md:p-6 lg:p-8 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border border-muted-foreground/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-8 h-8 border border-muted-foreground/15 rounded-sm"></div>
              </div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground/20 font-light">Image à venir</div>
            </div>
          </div>
        )}
      </div>

      {/* Nom du parfum - Minimaliste, en dessous */}
      <div className="mt-4 px-2 text-center">
        <h3 className="font-serif text-base md:text-lg text-foreground/90 group-hover:text-foreground transition-colors duration-300 leading-tight font-light">
          {perfume.name}
        </h3>
      </div>
    </div>
  );
};

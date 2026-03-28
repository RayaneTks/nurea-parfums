import { Star, StarOff, Info } from "lucide-react";
import Image from "next/image";

type PerfumeRow = {
  id: number;
  name: string;
  image: string;
  imageLight: string | null;
  status: string;
  isFeatured?: boolean;
  brand: { name: string };
};

interface FeaturedListProps {
  perfumes: PerfumeRow[];
  canEdit: boolean;
  onToggleFeatured: (id: number, currentFeatured: boolean) => void;
  pendingFeaturedIds: Set<number>;
}

export function FeaturedList({
  perfumes,
  canEdit,
  onToggleFeatured,
  pendingFeaturedIds,
}: FeaturedListProps) {
  const featuredPerfumes = perfumes.filter(p => p.isFeatured);
  const otherPerfumes = perfumes.filter(p => !p.isFeatured && p.status === "PUBLISHED");

  const canAddMore = featuredPerfumes.length < 2;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-200/80">
          <p className="font-semibold text-blue-300 mb-1">Mise en avant sur l&apos;accueil</p>
          Sélectionnez jusqu&apos;à 2 parfums à afficher en haut de la page d&apos;accueil. Seuls les parfums publiés peuvent être mis en avant.
          <br/>
          <span className="font-medium text-blue-300 mt-2 block">
             Actuellement : {featuredPerfumes.length} / 2
          </span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          Parfums mis en avant ({featuredPerfumes.length})
        </h3>
        {featuredPerfumes.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
            <p className="text-zinc-500 text-sm">Aucun parfum mis en avant actuellement.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {featuredPerfumes.map(p => (
              <PerfumeFeatureCard
                key={p.id}
                perfume={p}
                isFeatured={true}
                canEdit={canEdit}
                onToggle={() => onToggleFeatured(p.id, true)}
                isPending={pendingFeaturedIds.has(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-zinc-100 mb-4">Autres parfums publiés</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {otherPerfumes.map(p => (
            <PerfumeFeatureCard
              key={p.id}
              perfume={p}
              isFeatured={false}
              canEdit={canEdit}
              disabled={!canAddMore}
              onToggle={() => onToggleFeatured(p.id, false)}
              isPending={pendingFeaturedIds.has(p.id)}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

function PerfumeFeatureCard({
  perfume,
  isFeatured,
  canEdit,
  disabled,
  onToggle,
  isPending
}: {
  perfume: PerfumeRow;
  isFeatured: boolean;
  canEdit: boolean;
  disabled?: boolean;
  onToggle: () => void;
  isPending: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 p-3 bg-zinc-900 border ${isFeatured ? 'border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'border-zinc-800'} rounded-2xl transition-all`}>
      <div className="relative h-16 w-12 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
        <Image src={perfume.image} alt={perfume.name} fill className="object-cover" sizes="48px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-100 truncate">{perfume.name}</p>
        <p className="text-xs text-zinc-500 truncate">{perfume.brand.name}</p>
      </div>
      {canEdit && (
        <button
          onClick={onToggle}
          disabled={disabled || isPending}
          className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl transition-all ${
            isPending ? 'opacity-50 cursor-not-allowed' :
            isFeatured 
              ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' 
              : disabled
                ? 'opacity-30 cursor-not-allowed text-zinc-500 bg-zinc-800'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
          }`}
          title={isFeatured ? "Retirer de la mise en avant" : disabled ? "Limite de 2 atteinte" : "Mettre en avant"}
        >
          {isFeatured ? <StarOff className="h-5 w-5" /> : <Star className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}

import { Perfume } from "@/data/perfumes";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
}

export const PerfumeCard = ({ perfume, onClick }: PerfumeCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer bg-background/30 border border-border/30 hover:border-primary/30 transition-all duration-500 p-8 flex flex-col min-h-[240px] hover:bg-background/40"
    >
      {perfume.tags && perfume.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {perfume.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] uppercase tracking-[0.15em] text-primary/70 font-light"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex-1">
        <h3 className="font-serif text-3xl mb-3 text-foreground group-hover:text-primary/90 transition-colors duration-300 leading-[1.1] font-light">
          {perfume.name}
        </h3>
        <p className="text-sm text-muted-foreground/60 mb-4 font-light tracking-wide">
          {perfume.brand}
        </p>
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] mt-4 font-light">
          {perfume.category}
        </p>
      </div>
      
      <div className="mt-8 pt-6 border-t border-border/20">
        <span className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] group-hover:text-primary/60 transition-colors duration-300 font-light">
          Disponible sur demande
        </span>
      </div>
    </div>
  );
};

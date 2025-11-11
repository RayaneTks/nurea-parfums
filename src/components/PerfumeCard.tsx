import { Perfume } from "@/data/perfumes";
import { Badge } from "./ui/badge";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
}

export const PerfumeCard = ({ perfume, onClick }: PerfumeCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer bg-card/40 backdrop-blur-sm border border-border/50 hover:border-primary/50 transition-all duration-500 p-6 hover:bg-card/60 flex flex-col min-h-[200px]"
    >
      {perfume.tags && perfume.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {perfume.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] uppercase tracking-wider text-primary/80 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex-1">
        <h3 className="font-serif text-2xl mb-2 text-foreground group-hover:text-primary transition-colors duration-300 leading-tight">
          {perfume.name}
        </h3>
        <p className="text-sm text-muted-foreground/80 mb-1 font-light">
          {perfume.brand}
        </p>
        <p className="text-xs text-muted-foreground/60 uppercase tracking-wider mt-3">
          {perfume.category}
        </p>
      </div>
      
      <div className="mt-6 pt-4 border-t border-border/30">
        <span className="text-xs text-muted-foreground/50 group-hover:text-primary/70 transition-colors duration-300">
          Disponible
        </span>
      </div>
    </div>
  );
};

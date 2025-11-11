import { Perfume } from "@/data/perfumes";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
}

export const PerfumeCard = ({ perfume, onClick }: PerfumeCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer border-b border-border/15 hover:border-primary/20 transition-all duration-500 py-8 flex flex-col min-h-[200px]"
    >
      {perfume.tags && perfume.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {perfume.tags.map((tag) => (
            <span
              key={tag}
              className="text-[8px] uppercase tracking-[0.25em] text-primary/60 font-light"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex-1">
        <h3 className="font-serif text-2xl md:text-3xl mb-2 text-foreground group-hover:text-primary/80 transition-colors duration-300 leading-[1.15] font-light">
          {perfume.name}
        </h3>
        <p className="text-xs text-muted-foreground/50 mb-3 font-light tracking-wide">
          {perfume.brand}
        </p>
        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-[0.25em] mt-5 font-light">
          {perfume.category}
        </p>
      </div>
    </div>
  );
};

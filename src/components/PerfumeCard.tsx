import { Perfume } from "@/data/perfumes";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
}

export const PerfumeCard = ({ perfume, onClick }: PerfumeCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer border-r border-b border-border/10 hover:bg-background/20 transition-all duration-500 p-6 md:p-8 flex flex-col min-h-[220px] bg-background"
    >
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

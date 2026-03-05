import { Perfume, defaultSizes } from "@/data/perfumes";
import { getPerfumeImage } from "@/lib/perfume-media";
import { cn } from "@/lib/utils";

interface PerfumeCardProps {
  perfume: Perfume;
  onClick: () => void;
  variant?: "desktop" | "mobile";
  isDetailsOpen?: boolean;
  onDetailsToggle?: (perfumeId: string) => void;
}

export const PerfumeCard = ({ perfume, onClick, variant = "desktop" }: PerfumeCardProps) => {
  const image = getPerfumeImage(perfume.id);
  const sizes = perfume.availableSizes || defaultSizes;

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/35 bg-card/50 shadow-sm transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_18px_45px_-30px_hsl(var(--primary)/0.7)]",
        variant === "mobile" ? "rounded-xl" : "rounded-2xl"
      )}
    >
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        <div className={cn("relative overflow-hidden border-b border-border/30", variant === "mobile" ? "aspect-[4/5]" : "aspect-[4/5]")}>
          {image ? (
            <img
              src={image}
              alt={`${perfume.name} - ${perfume.brand}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 brightness-100 dark:brightness-100"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/30">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Image a venir</p>
            </div>
          )}

          {perfume.tags?.includes("Best-seller") && (
            <span className="absolute left-2 top-2 rounded-full border border-primary/40 bg-background/90 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-primary shadow-sm backdrop-blur-sm">
              Best seller
            </span>
          )}
        </div>

        <div className={cn("space-y-2 p-3", variant === "mobile" ? "p-3" : "p-4")}>
          <p className="text-[10px] uppercase tracking-[0.14em] text-primary/85">{perfume.brand}</p>
          <h3 className={cn("line-clamp-2 font-serif text-foreground", variant === "mobile" ? "text-sm" : "text-base")}>{perfume.name}</h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">{perfume.category}</p>
          <p className="text-xs text-muted-foreground/90">Tailles: {sizes.join(" / ")} ml</p>
          <span className="inline-flex items-center text-xs font-medium text-primary">Voir la fiche</span>
        </div>
      </button>
    </article>
  );
};

import { Brand } from "@/data/perfumes";
import { getBrandImage } from "@/lib/perfume-media";
import { cn } from "@/lib/utils";

interface BrandCardProps {
  brand: Brand;
  onClick: () => void;
  variant?: "desktop" | "mobile";
}

export const BrandCard = ({ brand, onClick, variant = "desktop" }: BrandCardProps) => {
  const image = getBrandImage(brand.name);

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
              alt={`Collection ${brand.name}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/30">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Collection complete</p>
            </div>
          )}
        </div>

        <div className="space-y-2 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-primary/85">{brand.category}</p>
          <h3 className={cn("line-clamp-2 font-serif text-foreground", variant === "mobile" ? "text-base" : "text-lg")}>{brand.name}</h3>
          <p className="text-xs text-muted-foreground">Gamme complete disponible</p>
          <span className="inline-flex items-center text-xs font-medium text-primary">Voir la marque</span>
        </div>
      </button>
    </article>
  );
};

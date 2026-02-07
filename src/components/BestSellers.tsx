import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PerfumeCard } from "@/components/PerfumeCard";
import { perfumes } from "@/data/perfumes";
import { buildProductPath } from "@/lib/catalog";

export const BestSellers = () => {
  const navigate = useNavigate();

  const bestSellers = useMemo(() => perfumes.filter((perfume) => perfume.tags?.includes("Best-seller")).slice(0, 8), []);

  if (!bestSellers.length) {
    return null;
  }

  return (
    <section className="border-t border-border/30 bg-card/20 px-3 py-12 sm:px-4 sm:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-primary/85">Selection demandee</p>
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Best sellers Nurea</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Les references les plus demandees, visibles en un coup d'oeil.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {bestSellers.map((perfume) => (
            <PerfumeCard key={perfume.id} perfume={perfume} variant="mobile" onClick={() => navigate(buildProductPath(perfume))} />
          ))}
        </div>
      </div>
    </section>
  );
};

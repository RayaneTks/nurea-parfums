import { perfumes } from "@/data/perfumes";
import { useMemo, useState } from "react";
import { PerfumeCard } from "./PerfumeCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

export const BestSellers = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  
  const handleDetailsToggle = (perfumeId: string) => {
    setOpenDetailsId(prev => prev === perfumeId ? null : perfumeId);
  };

  const bestSellers = useMemo(() => {
    return perfumes
      .filter((p) => p.tags?.includes("Best-seller"))
      .slice(0, 4);
  }, []);

  if (bestSellers.length === 0) return null;

  const handlePerfumeClick = (perfume: typeof perfumes[0]) => {
    const brand = encodeURIComponent(perfume.brand);
    const name = encodeURIComponent(perfume.name);
    navigate(`/parfums/${brand}/${name}`);
  };

  return (
    <section className="py-16 md:py-24 bg-background border-t border-border/10">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="text-center mb-8 md:mb-12 lg:mb-16 px-4">
          <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl xl:text-6xl text-foreground mb-3 md:mb-4 tracking-tight font-light">
            Best-sellers
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-muted-foreground/80 max-w-2xl mx-auto font-light">
            Nos parfums les plus demandés
          </p>
        </div>

        {!isMobile ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 max-w-[1400px] mx-auto">
            {bestSellers.map((perfume) => (
              <PerfumeCard
                key={perfume.id}
                perfume={perfume}
                onClick={() => handlePerfumeClick(perfume)}
                variant="desktop"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4">
            {bestSellers.map((perfume) => (
              <PerfumeCard
                key={perfume.id}
                perfume={perfume}
                onClick={() => handlePerfumeClick(perfume)}
                variant="mobile"
                isDetailsOpen={openDetailsId === perfume.id}
                onDetailsToggle={handleDetailsToggle}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};


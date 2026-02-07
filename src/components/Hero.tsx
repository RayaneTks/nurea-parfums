import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import logo from "@/assets/nurea-logo-transparent.png";
import bgImage from "@/assets/bg.png";
import { Button } from "@/components/ui/button";
import { categories, fullRangeBrands, perfumes } from "@/data/perfumes";

export const Hero = () => {
  const categoryCount = categories.filter((category) => category !== "Tous").length;
  const perfumeCount = perfumes.length;
  const brandCount = new Set(perfumes.map((perfume) => perfume.brand)).size + fullRangeBrands.length;

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-border/30 bg-gradient-to-b from-background via-background to-card/40 px-4 pb-16 pt-10 sm:pb-20 sm:pt-14"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: `radial-gradient(circle at 10% 15%, hsl(var(--primary) / 0.38), transparent 35%), radial-gradient(circle at 92% 80%, hsl(var(--primary) / 0.2), transparent 34%), url(${bgImage})`,
          backgroundSize: "auto, auto, cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-7">
          <img src={logo} alt="Nurea Parfums" className="h-20 w-20 opacity-90 sm:h-24 sm:w-24" loading="eager" decoding="async" />

          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Collection Nurea
            </p>
            <h1 className="max-w-3xl font-serif text-4xl leading-[0.92] text-foreground sm:text-5xl lg:text-6xl">
              Catalogue de parfums premium, simple a explorer sur mobile et desktop
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Retrouvez rapidement les parfums de niche et les grands classiques, filtrez par categorie, marque ou genre, puis
              contactez-nous directement sur Snapchat ou WhatsApp.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-12 px-7 text-sm uppercase tracking-[0.16em] sm:h-11">
              <Link to="/catalogue">
                Ouvrir le catalogue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 border-primary/40 bg-card/20 px-7 text-sm uppercase tracking-[0.16em] sm:h-11">
              <Link to="/categories">Explorer les categories</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/40 bg-card/35 p-4 backdrop-blur-xl sm:p-5">
          <article className="rounded-xl border border-border/30 bg-background/50 p-3 text-center sm:p-4">
            <p className="text-2xl font-semibold text-primary sm:text-3xl">{perfumeCount}+</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Parfums</p>
          </article>
          <article className="rounded-xl border border-border/30 bg-background/50 p-3 text-center sm:p-4">
            <p className="text-2xl font-semibold text-primary sm:text-3xl">{brandCount}+</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Marques</p>
          </article>
          <article className="rounded-xl border border-border/30 bg-background/50 p-3 text-center sm:p-4">
            <p className="text-2xl font-semibold text-primary sm:text-3xl">{categoryCount}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Categories</p>
          </article>
        </div>
      </div>
    </section>
  );
};

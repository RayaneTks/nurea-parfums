import Link from "next/link";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/nurea-logo-transparent.png";
import bgImage from "@/assets/bg.png";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  const logoSrc = typeof logo === "string" ? logo : (logo as { src: string }).src;

  return (
    <section id="hero" className="relative overflow-hidden border-b border-border/30 px-4 pb-14 pt-10 sm:pb-16 sm:pt-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage: `linear-gradient(120deg, transparent 0%, hsl(var(--primary) / 0.18) 55%, transparent 100%), url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <img src={logoSrc} alt="Nurea Parfums" className="h-20 w-20 opacity-90 sm:h-24 sm:w-24" loading="eager" decoding="async" />

          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-primary/90">Maison Nurea</p>
            <h1 className="max-w-3xl font-serif text-4xl leading-[0.94] text-foreground sm:text-5xl lg:text-6xl">
              Une selection de parfums pensee comme un carnet personnel
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Navigation claire, recherche rapide et pages marque dediees. Le catalogue est concu pour trouver un parfum en
              quelques secondes, sans complexite inutile.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="h-12 px-7 text-sm uppercase tracking-[0.14em] sm:h-11">
              <Link href="/catalogue">
                Voir le catalogue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12 border-primary/40 bg-card/25 px-7 text-sm uppercase tracking-[0.14em] sm:h-11">
              <Link href="/marques">Explorer les marques</Link>
            </Button>
          </div>
        </div>

        <aside className="rounded-2xl border border-border/40 bg-card/30 p-5 backdrop-blur-xl sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary/85">Signature</p>
          <h2 className="mt-2 font-serif text-3xl text-foreground sm:text-4xl">Luxe lisible, choix facile</h2>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>Chaque page suit le meme principe: filtrer, comparer, contacter.</p>
            <p>Pas de surcharge visuelle, seulement les infos utiles pour choisir vite.</p>
            <p className="pt-2 font-serif text-xl italic text-primary/90">Nurea Parfums</p>
          </div>
        </aside>
      </div>
    </section>
  );
};

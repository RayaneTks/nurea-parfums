"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/Separator";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const MarquePageClient = () => {
  const domain = SITE_URL.replace(/^https?:\/\//, "");

  return (
    <div className="nurea-vitrine-shell grain flex flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar />

      <main id="main-content" className="min-w-0 flex-1">
        {/* Hero Section */}
        <section className="relative px-4 pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
          <div className="mx-auto max-w-[880px]">
            <ScrollReveal>
              <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
                La Parfumerie
              </span>
              <h1 className="font-serif text-[clamp(32px,7vw,56px)] leading-[1.1] text-[var(--nurea-text)]">    
                L'Excellence à votre portée
              </h1>
              <p className="mt-8 text-[17px] leading-[1.8] text-[var(--nurea-text-muted)] font-light">
                {SITE_NAME} est votre destination privilégiée pour les plus grands parfums au meilleur prix. Nous sélectionnons rigoureusement chaque référence pour vous garantir une qualité irréprochable et une authenticité totale.
              </p>
            </ScrollReveal>
          </div>
        </section>

        <Separator variant="bordeaux" className="opacity-40" />

        {/* Vision Section */}
        <section className="px-4 py-16 md:py-24">
          <div className="mx-auto max-w-[880px] grid gap-12 md:gap-20">
            <ScrollReveal delay={100}>
              <div className="grid md:grid-cols-2 gap-8 items-start">
                <div>
                  <h2 className="font-serif text-2xl text-[var(--nurea-text)] mb-6">Une Sélection des Plus Grandes Marques</h2>
                  <p className="text-[15px] leading-[1.7] text-[var(--nurea-text-muted)]">
                    Notre catalogue regroupe les fragrances les plus prisées du moment. Que vous cherchiez un grand classique ou une nouveauté tendance, nous avons sélectionné le meilleur du marché pour homme et femme.
                  </p>
                </div>
                <div className="pt-2 md:pt-12">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)] mb-4">Prix Compétitifs</h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--nurea-text-muted)]">
                    Nous travaillons au quotidien pour vous proposer les tarifs les plus justes sur l'ensemble de notre catalogue, sans jamais sacrifier la qualité.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="border border-[var(--nurea-border)] bg-[var(--nurea-surface)] p-8 md:p-12 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--nurea-accent)] opacity-20 group-hover:h-full transition-all duration-700" />
                <h2 className="font-serif text-2xl text-[var(--nurea-text)] mb-6 text-center md:text-left">Conseils & Commande</h2>
                <p className="text-[15px] leading-[1.8] text-[var(--nurea-text-muted)] max-w-2xl">
                  Parce qu'un parfum est un choix personnel, nous sommes à votre disposition pour vous conseiller. Notre catalogue est une vitrine : pour commander, il vous suffit de nous contacter sur Snapchat ou WhatsApp.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link href="/contact" className="btn-nurea text-[11px]">Nous contacter</Link>        
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator variant="copper" className="opacity-30" />

        {/* Identité Section */}
        <section className="px-4 py-16 md:py-24 bg-black/20">
          <div className="mx-auto max-w-[880px]">
            <ScrollReveal>
              <h2 className="font-serif text-xl text-[var(--nurea-text)] mb-8">Notre Identité</h2>
              <div className="grid gap-8 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                <p>
                  Basée à Marseille, Nuréa Parfums cultive la proximité et la réactivité. Pour vous garantir l'authenticité de nos produits, veillez à toujours consulter notre site officiel : <span className="text-[var(--nurea-text)] font-medium">{domain}</span>.
                </p>
                <p>
                  L'orthographe de notre nom s'écrit avec soin : <strong className="text-[var(--nurea-accent)] font-semibold italic">Nuréa Parfums</strong>. Un accent sur le « é », un « s » à Parfums. Cette précision reflète l'attention que nous portons à chaque détail de votre commande.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="mt-16 border-t border-[var(--nurea-border)] pt-12">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)] mb-8">Questions Fréquentes</h3>
                <div className="grid gap-10">
                  <div className="group">
                    <h4 className="text-[15px] font-medium text-[var(--nurea-text)] mb-3 group-hover:text-[var(--nurea-accent)] transition-colors italic">Le catalogue contient-il tous vos stocks ?</h4>
                    <p className="text-[14px] text-[var(--nurea-text-muted)] leading-relaxed">
                      Notre site présente nos références principales. Si vous ne trouvez pas votre parfum habituel, demandez-nous directement sur Snapchat : nous avons souvent des arrivages fréquents.
                    </p>
                  </div>
                  <div className="group">
                    <h4 className="text-[15px] font-medium text-[var(--nurea-text)] mb-3 group-hover:text-[var(--nurea-accent)] transition-colors italic">Comment commander ?</h4>
                    <p className="text-[14px] text-[var(--nurea-text-muted)] leading-relaxed">
                      C'est très simple : envoyez-nous une capture d'écran du parfum souhaité sur Snapchat ou WhatsApp. Nous confirmons le prix et la disponibilité, puis finalisons la livraison ensemble.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="px-4 py-20 text-center">
          <ScrollReveal direction="scale">
            <h2 className="font-serif text-3xl mb-8">Trouvez votre prochain parfum</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/" className="btn-nurea btn-accent">Voir le Catalogue</Link>
              <Link href="/contact" className="btn-nurea">Nous contacter</Link>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};

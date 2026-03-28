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
    <div className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar />
      
      <main id="main-content" className="flex-1">
        {/* Hero Section Marque */}
        <section className="relative px-4 pt-24 pb-16 md:pt-36 md:pb-24 overflow-hidden">
          <div className="mx-auto max-w-[880px]">
            <ScrollReveal>
              <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
                La Maison
              </span>
              <h1 className="font-serif text-[clamp(32px,7vw,56px)] leading-[1.1] text-[var(--nurea-text)]">
                L&apos;Éloge de l&apos;Exceptionnel
              </h1>
              <p className="mt-8 text-[17px] leading-[1.8] text-[var(--nurea-text-muted)] font-light">
                {SITE_NAME} n&apos;est pas simplement une parfumerie. C&apos;est un sanctuaire dédié aux sillages qui racontent une histoire, à ces essences rares qui capturent l&apos;invisible et subliment l&apos;instant.
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
                  <h2 className="font-serif text-2xl text-[var(--nurea-text)] mb-6">Une Sélection Sans Compromis</h2>
                  <p className="text-[15px] leading-[1.7] text-[var(--nurea-text-muted)]">
                    Chaque flacon présent dans notre collection est le fruit d&apos;une quête obsessionnelle de la qualité. Nous ne référençons que des créations qui possèdent une âme, une tenue exemplaire et une signature olfactive qui ne laisse personne indifférent.
                  </p>
                </div>
                <div className="pt-2 md:pt-12">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)] mb-4">Notre Expertise</h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--nurea-text-muted)]">
                    Des maisons de niche confidentielles aux classiques intemporels, nous explorons les territoires olfactifs les plus exigeants pour vous offrir l&apos;inattendu.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="border border-[var(--nurea-border)] bg-[var(--nurea-surface)] p-8 md:p-12 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--nurea-accent)] opacity-20 group-hover:h-full transition-all duration-700" />
                <h2 className="font-serif text-2xl text-[var(--nurea-text)] mb-6 text-center md:text-left">La Proximité au Cœur de l&apos;Échange</h2>
                <p className="text-[15px] leading-[1.8] text-[var(--nurea-text-muted)] max-w-2xl">
                  À l&apos;ère du tout numérique, nous avons choisi de préserver l&apos;humain. Notre catalogue est une invitation au dialogue. Pour chaque référence, nous sommes là pour vous conseiller, vérifier une disponibilité ou organiser une découverte personnalisée.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link href="/contact" className="btn-nurea text-[11px]">Engager la conversation</Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <Separator variant="copper" className="opacity-30" />

        {/* Identité & Sécurité Section (Clean SEO) */}
        <section className="px-4 py-16 md:py-24 bg-black/20">
          <div className="mx-auto max-w-[880px]">
            <ScrollReveal>
              <h2 className="font-serif text-xl text-[var(--nurea-text)] mb-8">Ancrage & Identité</h2>
              <div className="grid gap-8 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                <p>
                  Basée à Marseille, la Maison Nuréa Parfums cultive la proximité et la discrétion. Pour vous garantir l&apos;authenticité de nos produits et de nos échanges, veillez à toujours consulter notre domaine unique : <span className="text-[var(--nurea-text)] font-medium">{domain}</span>. 
                </p>
                <p>
                  L&apos;orthographe de la Maison s&apos;écrit avec élégance : <strong className="text-[var(--nurea-accent)] font-semibold italic">Nuréa Parfums</strong>. Un accent sur le « é », un « s » à Parfums. Cette précision reflète l&apos;attention que nous portons à chaque détail de votre expérience.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="mt-16 border-t border-[var(--nurea-border)] pt-12">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)] mb-8">Questions Fréquentes</h3>
                <div className="grid gap-10">
                  <div className="group">
                    <h4 className="text-[15px] font-medium text-[var(--nurea-text)] mb-3 group-hover:text-[var(--nurea-accent)] transition-colors italic">Le catalogue est-il exhaustif ?</h4>
                    <p className="text-[14px] text-[var(--nurea-text-muted)] leading-relaxed">
                      Notre vitrine numérique présente une sélection soigneusement éditée. De nombreuses exclusivités et arrivages ne sont confirmés qu&apos;en direct avec nos clients.
                    </p>
                  </div>
                  <div className="group">
                    <h4 className="text-[15px] font-medium text-[var(--nurea-text)] mb-3 group-hover:text-[var(--nurea-accent)] transition-colors italic">Comment se déroule une commande ?</h4>
                    <p className="text-[14px] text-[var(--nurea-text-muted)] leading-relaxed">
                      Tout commence par un échange sur WhatsApp, Snapchat ou par e-mail. Nous confirmons la disponibilité, vous conseillons sur le sillage, et finalisons la transaction de manière sécurisée et personnalisée.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="px-4 py-20 text-center">
          <ScrollReveal direction="scale">
            <h2 className="font-serif text-3xl mb-8">Prêt à trouver votre signature ?</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/" className="btn-nurea btn-accent">Explorer la Collection</Link>
              <Link href="/contact" className="btn-nurea">Nous écrire</Link>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <Footer />
    </div>
  );
};

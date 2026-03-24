"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/Separator";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const MarquePageClient = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const domain = SITE_URL.replace(/^https?:\/\//, "");

  return (
    <div className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar scrolled={scrolled} />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 py-16 md:px-10 md:py-24">
        <ScrollReveal>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
            Identité
          </p>
          <h1 className="font-serif text-[clamp(28px,6vw,40px)] leading-tight text-[var(--nurea-text)]">
            {SITE_NAME} — site officiel
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--nurea-text-muted)]">
            {SITE_NAME} est une maison de haute parfumerie indépendante. Pour nous
            retrouver en ligne, vérifiez toujours l&apos;orthographe{" "}
            <strong className="font-medium text-[var(--nurea-text)]">Nurea</strong>{" "}
            (N-U-R-E-A) et le domaine officiel{" "}
            <strong className="font-medium text-[var(--nurea-text)]">{domain}</strong>
            — c&apos;est le seul site qui centralise notre catalogue et la
            conciergerie.
          </p>
        </ScrollReveal>

        <Separator variant="copper" className="my-12 opacity-60" />

        <ScrollReveal delay={80}>
          <h2 className="font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
            Orthographe et recherches
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
            Les recherches du type « nurea parfum », « nurea parfums » ou « nurea »
            sans accent doivent mener vers ce site. Le nom complet de la maison
            s&apos;écrit <strong className="text-[var(--nurea-text)]">{SITE_NAME}</strong>{" "}
            (avec un &laquo; s &raquo; à Parfums). Des marques distinctes existent
            avec des graphies proches sur le marché du parfum et du luxe : si le
            domaine ou le logo ne correspondent pas à {domain}, vous n&apos;êtes
            pas sur la boutique officielle {SITE_NAME}.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <h2 className="mt-10 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
            Questions fréquentes
          </h2>
          <dl className="mt-6 space-y-8">
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Comment s&apos;écrit correctement le nom {SITE_NAME} ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                L&apos;orthographe officielle est « Nurea » (N-U-R-E-A), suivi de «
                Parfums » au pluriel : {SITE_NAME}.
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Quel est le site officiel de {SITE_NAME} ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                Le site officiel est {domain} — vérifiez l&apos;adresse dans votre
                navigateur pour éviter toute confusion avec des noms ou orthographes
                proches.
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                {SITE_NAME} est-il une marque indépendante ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                {SITE_NAME} est une maison de haute parfumerie indépendante.
                D&apos;autres marques ou orthographes similaires sur Internet sont
                des acteurs distincts ; seul le domaine et la conciergerie officiels
                garantissent nos services.
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Je ne trouve pas un parfum dans le catalogue, que faire ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                Contactez la conciergerie (
                <Link
                  href="/contact"
                  className="text-[var(--nurea-accent)] underline-offset-4 hover:underline"
                >
                  page Contact
                </Link>{" "}
                ou WhatsApp) : nous pouvons vous orienter ou rechercher une fragrance
                sur commande selon les disponibilités.
              </dd>
            </div>
          </dl>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <div className="mt-14 flex flex-wrap gap-4">
            <Link href="/" className="btn-nurea text-[10px] md:text-[11px]">
              Voir la collection
            </Link>
            <Link
              href="/contact"
              className="border border-[var(--nurea-border-hover)] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)]"
            >
              Conciergerie
            </Link>
          </div>
        </ScrollReveal>
      </main>
      <Footer />
    </div>
  );
};

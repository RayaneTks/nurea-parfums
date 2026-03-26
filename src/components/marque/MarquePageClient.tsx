"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Separator } from "@/components/ui/Separator";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const steps = [
  {
    title: "Explorer la sélection",
    body: "Le catalogue présente les maisons, signatures et gammes visibles du moment sans se substituer à la conversation.",
  },
  {
    title: "Confirmer avec la maison",
    body: "Disponibilités, arrivages, variantes ou recommandations se confirment en direct avec Nurea Parfums.",
  },
  {
    title: "Poursuivre l’échange",
    body: "La page Contact regroupe messagerie instantanée et e-mail : vous choisissez le canal qui vous convient.",
  },
];

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
      <main
        id="main-content"
        className="mx-auto flex-1 w-full max-w-[880px] px-4 py-16 md:px-10 md:py-24"
      >
        <ScrollReveal>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
            Identité
          </p>
          <h1 className="font-serif text-[clamp(28px,6vw,40px)] leading-tight text-[var(--nurea-text)]">
            {SITE_NAME} — site officiel
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--nurea-text-muted)]">
            {SITE_NAME} est une maison de haute parfumerie indépendante. Le
            site officiel présente la sélection et les références du moment, et
            relie à la maison pour tout ce qui dépasse la vitrine.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
            Pour nous retrouver en ligne, vérifiez toujours l’orthographe{" "}
            <strong className="font-medium text-[var(--nurea-text)]">Nurea</strong>{" "}
            (N-U-R-E-A) ainsi que le domaine officiel{" "}
            <strong className="font-medium text-[var(--nurea-text)]">
              {domain}
            </strong>
            . C’est le seul site qui rassemble la collection, l’univers de marque
            et le contact officiel avec la maison.
          </p>
        </ScrollReveal>

        <Separator variant="copper" className="my-12 opacity-60" />

        <ScrollReveal delay={80}>
          <h2 className="font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
            Notre manière de faire
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-5"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--nurea-accent)]">
                  {step.title}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={120}>
          <h2 className="mt-12 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
            Orthographe et recherches
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
            Les recherches du type « nurea parfum », « nurea parfums » ou «
            nurea » sans accent doivent mener vers ce site. Le nom complet de
            la maison s’écrit{" "}
            <strong className="text-[var(--nurea-text)]">{SITE_NAME}</strong>{" "}
            avec « Parfums » au pluriel.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
            Des marques distinctes existent avec des graphies proches sur le
            marché du parfum et du luxe. Si le domaine ou le logo ne
            correspondent pas à {domain}, vous n’êtes pas sur la présence
            officielle {SITE_NAME}.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={160}>
          <h2 className="mt-12 font-serif text-xl text-[var(--nurea-text)] md:text-2xl">
            Questions fréquentes
          </h2>
          <dl className="mt-6 space-y-8">
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Comment s’écrit correctement le nom {SITE_NAME} ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                L’orthographe officielle est « Nurea » (N-U-R-E-A), suivie de
                « Parfums » au pluriel : {SITE_NAME}.
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Quel est le site officiel de {SITE_NAME} ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                Le site officiel est {domain}. Vérifiez toujours l’adresse dans
                votre navigateur avant de poursuivre un échange.
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Le catalogue montre-t-il tout ce que la maison peut proposer ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                Non. Le catalogue reste une vitrine éditoriale. Certaines
                références, arrivages ou alternatives se confirment uniquement
                en conversation avec la maison.
              </dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--nurea-accent)]">
                Je ne trouve pas un parfum dans le catalogue, que faire ?
              </dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                Passez par la{" "}
                <Link
                  href="/contact"
                  className="text-[var(--nurea-accent)] underline-offset-4 hover:underline"
                >
                  page Contact
                </Link>{" "}
                : nous vous orientons ou vérifions une référence plus
                précisément.
              </dd>
            </div>
          </dl>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mt-14 flex flex-wrap gap-4">
            <Link href="/" className="btn-nurea text-[10px] md:text-[11px]">
              Voir la collection
            </Link>
            <Link
              href="/contact"
              className="border border-[var(--nurea-border-hover)] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)]"
            >
              Nous contacter
            </Link>
          </div>
        </ScrollReveal>
      </main>
      <Footer />
    </div>
  );
};

"use client";

import type { FC, MouseEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ChevronDown, MessageCircleMore } from "lucide-react";

export const Hero: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // On utilise des valeurs par défaut stables pour le SSR afin d'éviter le mismatch
  const isDark = !mounted || resolvedTheme !== "light";
  const monogramSrc = isDark
    ? "/branding/monogram/np-free-cuivre.webp"
    : "/branding/monogram/np-free-bordeaux.webp";

  const handleScroll = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("collection");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", "#collection");
  };

  return (
    <header className="relative flex min-h-[88svh] items-center justify-center overflow-hidden bg-[var(--nurea-bg)] pb-10 pt-[calc(env(safe-area-inset-top,0px)+4.5rem)] md:min-h-[100svh] md:pb-16 md:pt-24">
      {/* Background Image - LCP Candidate */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/branding/visuel-hero.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_30%]"
          priority
          fetchPriority="high"
          quality={85}
          style={{ opacity: isDark ? 1 : 0.15 }}
        />
        {/* Overlays for contrast */}
        <div
          className="absolute inset-0"
          style={{ background: isDark ? "rgba(10, 5, 8, 0.72)" : "rgba(250, 246, 242, 0.4)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(to bottom, rgba(10,5,8,0.5) 0%, rgba(10,5,8,0.2) 35%, rgba(10,5,8,0.4) 60%, rgba(10,5,8,0.85) 100%)"
              : "linear-gradient(to bottom, transparent 0%, rgba(250,246,242,0.6) 70%, rgba(250,246,242,1) 100%)",
          }}
        />
      </div>

      {/* Monogram - Optimized for LCP discovery */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
        <Image
          src={
            mounted && !isDark
              ? "/branding/monogram/np-free-bordeaux.webp"
              : "/branding/monogram/np-free-cuivre.webp"
          }
          alt=""
          width={440}
          height={440}
          loading="eager"
          className="h-[280px] w-[280px] select-none md:h-[440px] md:w-[440px] lg:h-[540px] lg:w-[540px]"
          sizes="(max-width: 768px) 280px, 440px"
          quality={80}
          style={{
            opacity: mounted ? (isDark ? 0.04 : 0.045) : 0.04,
          }}
        />
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1]"
        style={{
          background: "radial-gradient(circle, rgba(216,128,128,0.08) 0%, transparent 60%)"
        }}
      />

      <div className="absolute left-6 top-1/2 hidden -translate-y-1/2 lg:block">
        <div
          className="h-28 w-[1px] bg-gradient-to-b from-transparent via-[var(--nurea-accent)] to-transparent opacity-20"
          style={{
            animation:
              "heroLineGrow 1.4s cubic-bezier(0.16,1,0.3,1) 1s both",
            transformOrigin: "top",
          }}
        />
      </div>
      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 lg:block">
        <div
          className="h-28 w-[1px] bg-gradient-to-b from-transparent via-[var(--nurea-accent)] to-transparent opacity-20"
          style={{
            animation:
              "heroLineGrow 1.4s cubic-bezier(0.16,1,0.3,1) 1.2s both",
            transformOrigin: "top",
          }}
        />
      </div>

      <div className="hero-stagger relative z-10 flex max-w-2xl flex-col items-center px-5 text-center">        
        <span className="mb-5 text-[11px] font-medium uppercase tracking-nurea-wide text-[var(--nurea-accent)] md:text-[12px]">
          Parfumerie d'Exception
        </span>

        <h1 className="mb-5 font-serif text-[clamp(38px,9vw,76px)] leading-[1.04] text-[var(--nurea-text)]">    
          L'Excellence du
          <br />
          <em className="not-italic" style={{ fontStyle: "italic" }}>
            Parfum
          </em>
        </h1>

        <p className="mb-8 max-w-md text-[15px] leading-[1.75] text-[var(--nurea-text-muted)] md:max-w-xl">     
          Retrouvez vos parfums préférés au meilleur prix. Une sélection rigoureuse des plus grandes marques pour homme et femme, disponible immédiatement.
        </p>

        <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#collection"
            onClick={handleScroll}
            className="btn-nurea btn-accent group w-full justify-center shadow-[0_0_40px_-8px_var(--nurea-glow)] sm:w-auto active-scale tap-highlight-transparent"
            aria-label="VOIR LE CATALOGUE"
          >
            VOIR LE CATALOGUE
            <ChevronDown
              size={14}
              className="transition-transform duration-500 group-hover:translate-y-1"
            />
          </a>
          <Link
            href="/contact"
            className="btn-nurea group w-full justify-center sm:w-auto active-scale tap-highlight-transparent"
            aria-label="COMMANDER"
          >
            Commander un Parfum
            <MessageCircleMore
              size={14}
              className="text-[var(--nurea-accent)] transition-transform duration-300 group-hover:-rotate-6"    
            />
          </Link>
        </div>

        <p className="mt-5 max-w-md text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-subtle)] md:text-[11px]">
          Échanges privés & Conseils sur-mesure
        </p>
      </div>

      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3">
        <div
          className="h-16 w-[1px] bg-gradient-to-b from-[var(--nurea-accent)] to-transparent"
          style={{ animation: "heroPulse 3s ease-in-out infinite" }}
        />
      </div>
    </header>
  );
};

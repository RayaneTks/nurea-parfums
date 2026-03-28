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
    ? "/branding/monogram/np-free-cuivre.png"
    : "/branding/monogram/np-free-bordeaux.png";

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
          src="/branding/visuel-hero.png"
          alt=""
          fill
          sizes="100vw"
          className={`object-cover object-[center_30%] transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}
          priority
          fetchPriority="high"
          quality={85}
        />
        {/* Overlays */}
        <div
          className="absolute inset-0 bg-[var(--nurea-bg)]/70 transition-colors duration-500"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-[var(--nurea-bg)]/50 via-transparent to-[var(--nurea-bg)]"
        />
      </div>

      {/* Monogram - Optimized for LCP discovery */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1]">
        <Image
          src={monogramSrc}
          alt=""
          width={440}
          height={440}
          loading="eager"
          className="h-[280px] w-[280px] select-none md:h-[440px] md:w-[440px] lg:h-[540px] lg:w-[540px]"
          sizes="(max-width: 768px) 280px, 440px"
          quality={80}
          style={{
            opacity: mounted ? (isDark ? 0.04 : 0.045) : 0,
          }}
        />
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[1]"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(216,128,128,0.08) 0%, transparent 60%)"
            : "radial-gradient(circle, rgba(139,58,58,0.06) 0%, transparent 55%)",
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
          Maison de Parfums
        </span>

        <h1 className="mb-5 font-serif text-[clamp(38px,9vw,76px)] leading-[1.04] text-[var(--nurea-text)]">
          L&apos;Émotion par le
          <br />
          <em className="not-italic" style={{ fontStyle: "italic" }}>
            Sillage
          </em>
        </h1>

        <p className="mb-8 max-w-md text-[15px] leading-[1.75] text-[var(--nurea-text-muted)] md:max-w-xl">
          Une galerie confidentielle dédiée aux essences d&apos;exception. Parcourez notre sélection et sollicitez la Maison pour une expertise personnalisée ou une commande privée.
        </p>

        <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#collection"
            onClick={handleScroll}
            className="btn-nurea btn-accent group w-full justify-center shadow-[0_0_40px_-8px_var(--nurea-glow)] sm:w-auto"
            aria-label="Voir la collection"
          >
            Découvrir la Collection
            <ChevronDown
              size={14}
              className="transition-transform duration-500 group-hover:translate-y-1"
            />
          </a>
          <Link
            href="/contact"
            className="btn-nurea group w-full justify-center sm:w-auto"
          >
            Engager le Dialogue
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

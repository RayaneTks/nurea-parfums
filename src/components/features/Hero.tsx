"use client";

import type { FC, MouseEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ChevronDown } from "lucide-react";

export const Hero: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  const showThemeContent = mounted;

  const handleScroll = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("collection");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", "#collection");
  };

  return (
    <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[var(--nurea-bg)]">
      {/* Background image + overlays — dark mode only */}
      {showThemeContent && isDark && (
        <>
          <Image
            src="/branding/visuel-hero.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_30%]"
            priority
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10, 5, 8, 0.72)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,5,8,0.5) 0%, rgba(10,5,8,0.2) 35%, rgba(10,5,8,0.4) 60%, rgba(10,5,8,0.85) 100%)",
            }}
          />
        </>
      )}

      {/* Light mode — warm layered gradients */}
      {showThemeContent && !isDark && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, #FAF6F2 0%, #F4ECE4 30%, #EDE2D8 60%, #FAF6F2 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(139,58,58,0.07) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(139,58,58,0.03) 50%, rgba(250,246,242,0.8) 100%)",
            }}
          />
        </>
      )}

      {/* Monogramme NP — large watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src={isDark ? "/branding/monogram/np-free-cuivre.png" : "/branding/monogram/np-free-bordeaux.png"}
          alt=""
          width={600}
          height={600}
          className="w-[280px] h-[280px] md:w-[440px] md:h-[440px] lg:w-[540px] lg:h-[540px] select-none"
          style={{
            opacity: isDark ? 0.04 : 0.045,
            animation: "heroMonogramFloat 10s ease-in-out infinite",
          }}
        />
      </div>

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(circle, rgba(139,58,58,0.08) 0%, transparent 60%)"
            : "radial-gradient(circle, rgba(139,58,58,0.06) 0%, transparent 55%)",
        }}
      />

      {/* Decorative side lines — desktop only */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:block">
        <div
          className="w-[1px] h-28 bg-gradient-to-b from-transparent via-[var(--nurea-accent)] to-transparent opacity-20"
          style={{
            animation:
              "heroLineGrow 1.4s cubic-bezier(0.16,1,0.3,1) 1s both",
            transformOrigin: "top",
          }}
        />
      </div>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block">
        <div
          className="w-[1px] h-28 bg-gradient-to-b from-transparent via-[var(--nurea-accent)] to-transparent opacity-20"
          style={{
            animation:
              "heroLineGrow 1.4s cubic-bezier(0.16,1,0.3,1) 1.2s both",
            transformOrigin: "top",
          }}
        />
      </div>

      {/* Content */}
      <div className="hero-stagger relative z-10 flex max-w-2xl flex-col items-center text-center px-5">
        <span className="mb-5 text-[11px] font-medium uppercase tracking-[0.45em] text-[var(--nurea-accent)] md:text-[12px]">
          Maison de Parfums
        </span>

        <h1 className="mb-5 font-serif text-[clamp(38px,9vw,76px)] leading-[1.04] text-[var(--nurea-text)]">
          L&apos;Art de la
          <br />
          <em className="not-italic" style={{ fontStyle: "italic" }}>
            Seduction
          </em>
        </h1>

        <p className="mb-10 max-w-sm text-[13px] leading-[1.85] text-[var(--nurea-text-muted)] md:text-[15px] md:max-w-md">
          Des fragrances d&apos;exception selectionnees avec exigence.
          <br className="hidden md:block" />
          Un catalogue vivant, une invitation au voyage olfactif.
        </p>

        <a
          href="#collection"
          onClick={handleScroll}
          className="btn-nurea group"
          aria-label="Decouvrir la collection"
        >
          Decouvrir la Collection
          <ChevronDown
            size={14}
            className="transition-transform duration-500 group-hover:translate-y-1"
          />
        </a>
      </div>

      {/* Bottom pulse line */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <div
          className="w-[1px] h-16 bg-gradient-to-b from-[var(--nurea-accent)] to-transparent"
          style={{ animation: "heroPulse 3s ease-in-out infinite" }}
        />
      </div>
    </header>
  );
};

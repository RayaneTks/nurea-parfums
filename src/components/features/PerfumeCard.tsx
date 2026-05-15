"use client";

import type { FC, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight, X } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { getPerfumeImage } from "@/lib/data";
import { NUREA_IMAGE_BLUR_DATA_URL } from "@/lib/blurPlaceholder";

interface PerfumeCardProps {
  perfume: Perfume;
  activeItem: number | null;
  setActiveItem: (id: number | null) => void;
  featured?: boolean;
  imagePriority?: boolean;
}

function contactHref(parfum: string, marque: string) {
  return `/contact?parfum=${encodeURIComponent(parfum)}&marque=${encodeURIComponent(marque)}`;
}

export const PerfumeCard: FC<PerfumeCardProps> = ({
  perfume,
  activeItem,
  setActiveItem,
  featured = false,
  imagePriority = false,
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const toggleId = useId().replace(/:/g, "");
  const panelId = `perfume-cta-${perfume.id}-${toggleId}`;

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== "light";
  const isActive = activeItem === perfume.id;
  const isGammeComplete = perfume.category === "Gammes Complètes";
  const imageSrc = mounted
    ? getPerfumeImage(perfume, isDark ? "dark" : "light")
    : perfume.image;

  const blurUrl = perfume.blurDataURL || NUREA_IMAGE_BLUR_DATA_URL;

  useEffect(() => {
    if (!isActive) return;
    let removeListener: (() => void) | undefined;
    const t = window.setTimeout(() => {
      const onOutside = (e: PointerEvent) => {
        if (cardRef.current?.contains(e.target as Node)) return;
        setActiveItem(null);
      };
      document.addEventListener("pointerdown", onOutside, true);
      removeListener = () =>
        document.removeEventListener("pointerdown", onOutside, true);
    }, 120);
    return () => {
      window.clearTimeout(t);
      removeListener?.();
    };
  }, [isActive, setActiveItem]);

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveItem(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isActive, setActiveItem]);

  const toggleActive = () => setActiveItem(isActive ? null : perfume.id);

  const onToggleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleActive();
    }
  };

  const hintLabel = isGammeComplete ? "Explorer la Gamme" : "Commander ce Parfum";

  return (
    <article
      ref={cardRef}
      data-open={isActive ? "true" : "false"}
      className={`group relative flex w-full min-h-0 flex-col card-hover touch-manipulation ${
        featured ? "card-featured" : ""
      }`}
    >
      {/* Luxury glow — desktop hover only */}
      <div className="pointer-events-none absolute -inset-2 z-0 opacity-0 transition-opacity duration-700 md:group-hover:opacity-100 md:pointer-fine:block hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--nurea-accent-subtle)] to-transparent blur-2xl" />
      </div>

      {/* ── Image wrapper ── */}
      <div
        className="card-image-wrapper relative z-10 aspect-[3/4] w-full min-h-0 overflow-hidden bg-[var(--nurea-surface)]"
        style={{ backfaceVisibility: "hidden", transform: "translate3d(0,0,0)" }}
      >
        {perfume.tags && (
          <div
            data-testid="perfume-tag-strip"
            className={`absolute left-0 top-2.5 z-20 flex flex-col gap-1 transition-opacity duration-300 md:top-3 ${
              isActive ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            aria-hidden={isActive}
          >
            {perfume.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-[var(--nurea-accent-solid)] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-white md:px-3 md:py-1 md:text-[10px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Image
          src={imageSrc}
          alt={`${perfume.brand} - ${perfume.name}`}
          fill
          sizes="(max-width: 480px) 50vw, (max-width: 768px) 45vw, (max-width: 1200px) 30vw, 300px"
          className="object-cover card-image-zoom"
          placeholder="blur"
          blurDataURL={blurUrl}
          priority={imagePriority}
          quality={80}
        />

        {/* Dimming overlay — tap/click to toggle */}
        <div
          className={`absolute inset-0 z-[8] transition-colors duration-500 ${
            isActive
              ? "pointer-events-none bg-black/15 md:bg-black/20 md:backdrop-blur-[2px]"
              : "bg-transparent hover:bg-black/5"
          }`}
          onClick={toggleActive}
          aria-hidden="true"
          role="button"
          aria-label={`En savoir plus sur ${perfume.name}`}
        />

        {/* Hint label —
            Mobile : toujours visible à opacité réduite (pas de hover sur tactile)
            Desktop : apparaît uniquement au survol */}
        {!isActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[10] flex justify-start p-3
              opacity-50 translate-y-0
              md:opacity-0 md:translate-y-3 md:group-hover:translate-y-0 md:group-hover:opacity-100
              transition-all duration-500"
          >
            <div className="bg-[var(--nurea-text)] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-bg)] shadow-2xl">
              {hintLabel}
            </div>
          </div>
        )}

        {/* ── DESKTOP ONLY: inset-0 overlay panel ── */}
        {isActive ? (
          <div
            id={panelId}
            role="region"
            aria-labelledby={`perfume-toggle-${perfume.id}`}
            className="hidden md:flex absolute inset-0 z-[15] min-h-0 flex-col items-stretch justify-center bg-[var(--nurea-bg)] p-0 backdrop-blur-3xl animate-fade-in-up sm:p-1 pointer-events-auto"
          >
            {isGammeComplete && perfume.classics ? (
              <div className="flex h-full min-h-0 w-full flex-col items-center px-2 pb-2 pt-3 sm:px-3 sm:pb-3 sm:pt-4">
                <p className="w-full text-center font-serif text-[13px] leading-snug tracking-wide text-[var(--nurea-text)] sm:text-[15px] md:text-lg">
                  {perfume.brand}
                </p>
                <p className="mb-3 mt-2 w-full text-center text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-accent)]">
                  Gamme Complète
                </p>
                <div className="min-h-0 w-full max-w-[280px] flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar [-webkit-overflow-scrolling:touch]">
                  <div className="flex flex-col gap-1.5 pb-2">
                    {perfume.classics.map((classic) => (
                      <Link
                        key={classic}
                        href={contactHref(classic, perfume.brand)}
                        className="group/btn flex min-h-[44px] w-full shrink-0 items-center justify-between border border-[var(--nurea-border)] bg-[var(--nurea-surface)]/40 px-3 py-2.5 text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-all duration-500 hover:border-[var(--nurea-accent)] hover:bg-[var(--nurea-accent-subtle)] hover:text-[var(--nurea-text)] sm:px-4 sm:py-3 md:px-5 md:text-[11px] active-scale tap-highlight-transparent"
                      >
                        <span className="min-w-0 flex-1 truncate pr-2 text-left font-medium">
                          {classic}
                        </span>
                        <ArrowRight
                          size={12}
                          className="shrink-0 text-[var(--nurea-accent)] transition-transform duration-500 group-hover/btn:-rotate-45"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setActiveItem(null)}
                  aria-label="Fermer la sélection"
                  className="mt-2 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors p-2 active-scale tap-highlight-transparent"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-[260px] flex-col gap-3 self-center px-4 py-2">
                <p className="text-center font-serif text-[15px] leading-snug text-[var(--nurea-text)] md:text-[18px]">
                  {isGammeComplete ? "Explorer la Gamme" : "Commander ce Parfum"}
                </p>
                <p className="mb-2 text-center text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-text-muted)]">
                  {isGammeComplete ? "Gamme Complète" : "Disponibilité & Commande"}
                </p>
                <Link
                  href={contactHref(perfume.name, perfume.brand)}
                  className="btn-nurea btn-accent w-full justify-center active-scale tap-highlight-transparent shadow-xl shadow-black/20 border border-white/10"
                >
                  <span>{isGammeComplete ? "Demander ce Parfum" : "Commander ce Parfum"}</span>
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-500 group-hover/btn:-rotate-45"
                  />
                </Link>
                <button
                  onClick={() => setActiveItem(null)}
                  aria-label="Fermer le dialogue"
                  className="mt-1 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors p-2 active-scale tap-highlight-transparent"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── MOBILE ONLY: panel expands below the image ──
          L'image reste toujours visible — le panneau s'étend en dessous */}
      <div
        className={`md:hidden overflow-hidden border-x border-[var(--nurea-border)] bg-[var(--nurea-bg)] transition-all duration-500 ease-out-expo ${
          isActive ? "border-b" : ""
        }`}
        style={{
          maxHeight: isActive
            ? isGammeComplete && perfume.classics
              ? `${Math.min(perfume.classics.length * 52 + 72, 300)}px`
              : "180px"
            : "0px",
          opacity: isActive ? 1 : 0,
        }}
        aria-hidden={!isActive}
      >
        {isGammeComplete && perfume.classics ? (
          <div className="px-3 pb-3 pt-3">
            <p className="mb-2 text-center text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-accent)]">
              Gamme Complète — {perfume.brand}
            </p>
            <div
              className="overflow-y-auto overscroll-contain custom-scrollbar [-webkit-overflow-scrolling:touch]"
              style={{ maxHeight: "220px" }}
            >
              <div className="flex flex-col gap-1">
                {perfume.classics.map((classic) => (
                  <Link
                    key={classic}
                    href={contactHref(classic, perfume.brand)}
                    className="group/btn flex min-h-[44px] w-full shrink-0 items-center justify-between border border-[var(--nurea-border)] bg-[var(--nurea-surface)]/40 px-3 py-2.5 text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-all duration-300 hover:border-[var(--nurea-accent)] hover:bg-[var(--nurea-accent-subtle)] hover:text-[var(--nurea-text)] active-scale tap-highlight-transparent"
                  >
                    <span className="min-w-0 flex-1 truncate pr-2 text-left font-medium">
                      {classic}
                    </span>
                    <ArrowRight
                      size={11}
                      className="shrink-0 text-[var(--nurea-accent)]"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 px-4 py-4">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-text-muted)]">
              Disponibilité & Commande
            </p>
            <Link
              href={contactHref(perfume.name, perfume.brand)}
              className="btn-nurea btn-accent w-full justify-center active-scale tap-highlight-transparent shadow-lg shadow-black/20 border border-white/10"
            >
              <span>Commander ce Parfum</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* ── Info + toggle button ── */}
      <button
        type="button"
        id={`perfume-toggle-${perfume.id}`}
        aria-expanded={isActive}
        aria-label={`${isGammeComplete ? "Explorer la gamme" : "Commander"} — ${perfume.brand} ${perfume.name}`}
        aria-controls={isActive ? panelId : undefined}
        className="relative z-10 flex w-full flex-col border-0 bg-transparent p-0 pt-3 text-left text-[var(--nurea-text)] outline-none md:pt-3.5 active-scale tap-highlight-transparent"
        onClick={toggleActive}
        onKeyDown={onToggleKeyDown}
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="flex-1 min-w-0">
            <span className="block truncate text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] mb-0.5">
              {perfume.brand}
            </span>
            <span className="block truncate font-serif text-[15px] tracking-tight sm:text-[16px] md:text-[17px]">
              {perfume.name}
            </span>
          </span>
        </span>
        <span className="mt-2.5 flex items-center gap-2 border-t border-[var(--nurea-border)] pt-2.5 pb-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-text)] md:text-[11px]">
            {isActive ? "Fermer" : isGammeComplete ? "Explorer la Gamme" : "Commander"}
          </span>
          {isActive ? (
            <X size={10} className="text-[var(--nurea-text-subtle)] md:hidden" />
          ) : (
            <ArrowRight
              size={10}
              className="text-[var(--nurea-accent)] opacity-0 -translate-x-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0"
            />
          )}
        </span>
      </button>
    </article>
  );
};

"use client";

import type { FC, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight } from "lucide-react";
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

  const hintLabel = isGammeComplete
    ? "Explorer la Sélection"
    : "Engager le Dialogue";

  return (
    <article
      ref={cardRef}
      data-open={isActive ? "true" : "false"}
      className={`group relative flex w-full min-h-0 flex-col card-hover touch-manipulation ${
        featured ? "card-featured" : ""
      }`}
    >
      {/* Luxury glow effect on hover (only for devices with pointer: fine) */}
      <div className="pointer-events-none absolute -inset-2 z-0 opacity-0 transition-opacity duration-700 md:group-hover:opacity-100 md:pointer-fine:block hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--nurea-accent-subtle)] to-transparent blur-2xl" />
      </div>

      <div 
        className="card-image-wrapper relative z-10 aspect-[3/4] w-full min-h-0 overflow-hidden bg-[var(--nurea-surface)]"
        style={{ backfaceVisibility: 'hidden', transform: 'translate3d(0,0,0)' }}
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

        <div
          className={`absolute inset-0 z-[8] transition-colors duration-500 ${isActive ? "pointer-events-none bg-black/20" : "bg-transparent hover:bg-black/5"}`}
          onClick={toggleActive}
          aria-hidden="true"
          role="button"
          aria-label={`En savoir plus sur ${perfume.name}`}
        />

        {!isActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[10] flex translate-y-3 justify-start p-3 opacity-0 transition-all duration-500 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          >
            <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]/90 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-text)] backdrop-blur-xl shadow-lg">
              {hintLabel}
            </div>
          </div>
        )}

        {isActive ? (
          <div
            id={panelId}
            role="region"
            aria-labelledby={`perfume-toggle-${perfume.id}`}
            className="absolute inset-0 z-[15] flex min-h-0 flex-col items-stretch justify-center bg-[var(--nurea-overlay)] p-0 backdrop-blur-3xl animate-fade-in-up sm:p-1"
          >
            {isGammeComplete && perfume.classics ? (
              <div className="flex h-full min-h-0 w-full flex-col items-center px-2 pb-2 pt-3 sm:px-3 sm:pb-3 sm:pt-4">
                <p className="w-full text-center font-serif text-[13px] leading-snug tracking-wide text-[var(--nurea-text)] sm:text-[15px] md:text-lg">
                  La Maison {perfume.brand}
                </p>
                <p className="mb-3 mt-2 w-full text-center text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-accent)]">
                  Édition Privée
                </p>
                <div className="min-h-0 w-full max-w-[280px] flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar [-webkit-overflow-scrolling:touch]">
                  <div className="flex flex-col gap-1.5 pb-2">
                    {perfume.classics.map((classic) => (
                      <Link
                        key={classic}
                        href="/contact"
                        className="group/btn flex min-h-[44px] w-full shrink-0 items-center justify-between border border-[var(--nurea-border)] bg-[var(--nurea-surface)]/40 px-3 py-2.5 text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-all duration-500 hover:border-[var(--nurea-accent)] hover:bg-[var(--nurea-accent-subtle)] hover:text-[var(--nurea-text)] sm:px-4 sm:py-3 md:px-5 md:text-[11px]"
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
                  className="mt-2 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors p-2"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-[260px] flex-col gap-3 self-center px-4 py-2">
                <p className="text-center font-serif text-[15px] leading-snug text-[var(--nurea-text)] md:text-lg">
                  Poursuivre l&apos;Émotion
                </p>
                <p className="mb-2 text-center text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-text-muted)]">
                  Expertise & Disponibilité
                </p>
                <Link
                  href="/contact"
                  className="group/btn flex min-h-[48px] w-full items-center justify-center gap-2 border border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)] px-4 py-3 text-[10px] font-medium uppercase tracking-nurea-wide text-[var(--nurea-text)] transition-all duration-500 hover:bg-[var(--nurea-accent-solid)] hover:text-white md:px-5 md:py-3.5 md:text-[11px]"
                >
                  Engager le Dialogue
                  <ArrowRight
                    size={12}
                    className="transition-transform duration-500 group-hover/btn:-rotate-45"
                  />
                </Link>
                <button
                  onClick={() => setActiveItem(null)}
                  aria-label="Fermer le dialogue"
                  className="text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors p-1"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        id={`perfume-toggle-${perfume.id}`}
        aria-expanded={isActive}
        aria-label={`${isGammeComplete ? "Explorer la Sélection" : "Engager le Dialogue"} - ${perfume.brand} ${perfume.name}`}
        aria-controls={isActive ? panelId : undefined}
        className="relative z-10 flex w-full flex-col border-0 bg-transparent p-0 pt-3 text-left text-[var(--nurea-text)] outline-none md:pt-3.5"
        onClick={toggleActive}
        onKeyDown={onToggleKeyDown}
      >
        <span className="mb-1 text-[9px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[10px]">
          {perfume.brand}
        </span>
        <span className="font-serif text-[16px] leading-snug tracking-wide md:text-[18px]">
          {perfume.name}
        </span>
        <span className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-colors duration-500 group-hover:text-[var(--nurea-text)] md:text-[11px]">
          {isGammeComplete ? "Explorer la Sélection" : "Engager le Dialogue"}
          <ArrowRight size={10} className="text-[var(--nurea-accent)] opacity-0 -translate-x-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0" />
        </span>
      </button>
    </article>
  );

};

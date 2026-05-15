"use client";

import type { FC, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight, FileText } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { getPerfumeImage, CONTACT } from "@/lib/data";
import { NUREA_IMAGE_BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { SnapchatIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { PerfumeSheet } from "./PerfumeSheet";

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

function whatsappUrl(parfum: string, marque: string) {
  const base = CONTACT.whatsapp.split("?")[0] ?? CONTACT.whatsapp;
  const msg = `Bonjour ! Je souhaite commander le parfum *${parfum}* de *${marque}* 🌹`;
  return `${base}?text=${encodeURIComponent(msg)}`;
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
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const toggleId = useId().replace(/:/g, "");
  const panelId = `perfume-cta-${perfume.id}-${toggleId}`;

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDark = resolvedTheme !== "light";
  const isActive = activeItem === perfume.id;
  const isGammeComplete = perfume.category === "Gammes Complètes";
  const imageSrc = mounted
    ? getPerfumeImage(perfume, isDark ? "dark" : "light")
    : perfume.image;

  const blurUrl = perfume.blurDataURL || NUREA_IMAGE_BLUR_DATA_URL;

  /* Close on outside click — desktop only (mobile uses sheet) */
  useEffect(() => {
    if (!isActive || isMobile) return;
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
  }, [isActive, isMobile, setActiveItem]);

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
    <>
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
                  className="inline-block bg-[var(--nurea-accent-solid)] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-white"
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

          {/* Dimming overlay */}
          <div
            className={`absolute inset-0 z-[8] transition-colors duration-500 ${
              isActive && !isMobile
                ? "pointer-events-none bg-black/20 backdrop-blur-[2px]"
                : "bg-transparent md:hover:bg-black/5"
            }`}
            onClick={toggleActive}
            aria-hidden="true"
            role="button"
            aria-label={`En savoir plus sur ${perfume.name}`}
          />

          {/* Hint label —
              Mobile: toujours visible (opacité réduite, pas de hover nécessaire)
              Desktop: apparaît au survol uniquement */}
          {(!isActive || isMobile) && (
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

          {/* ── DESKTOP ONLY: inset overlay panel ── */}
          {isActive && !isMobile ? (
            <div
              id={panelId}
              role="region"
              aria-labelledby={`perfume-toggle-${perfume.id}`}
              className="absolute inset-0 z-[15] flex min-h-0 flex-col items-stretch justify-center bg-[var(--nurea-bg)] backdrop-blur-3xl animate-fade-in-up pointer-events-auto p-4"
            >
              {isGammeComplete && perfume.classics ? (
                <div className="flex h-full min-h-0 flex-col items-center pt-2 pb-2">
                  <p className="w-full text-center font-serif text-[13px] leading-snug tracking-wide text-[var(--nurea-text)] md:text-[15px]">
                    {perfume.brand}
                  </p>
                  <p className="mb-3 mt-1.5 text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-accent)]">
                    Gamme Complète
                  </p>
                  <div className="min-h-0 w-full max-w-[280px] flex-1 overflow-y-auto overscroll-y-contain custom-scrollbar [-webkit-overflow-scrolling:touch]">
                    <div className="flex flex-col gap-1.5 pb-2">
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
                            size={12}
                            className="shrink-0 text-[var(--nurea-accent)] transition-transform duration-300 group-hover/btn:-rotate-45"
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveItem(null)}
                    aria-label="Fermer"
                    className="mt-2 text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors p-2 active-scale"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="mx-auto flex w-full max-w-[240px] flex-col gap-3 self-center">
                  <p className="text-center font-serif text-[13px] leading-snug text-[var(--nurea-text)] md:text-[16px]">
                    {perfume.name}
                  </p>
                  <p className="text-center text-[9px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)]">
                    Disponibilité & Commande
                  </p>
                  {/* Snap */}
                  <a
                    href={CONTACT.snapchat}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/s flex items-center gap-3 rounded-xl px-4 py-0 active-scale transition-transform"
                    style={{ backgroundColor: "#FFFC00", minHeight: 52 }}
                  >
                    <SnapchatIcon className="h-5 w-5 shrink-0 text-black" />
                    <span className="flex flex-col flex-1 text-left">
                      <span className="text-[8px] font-black uppercase tracking-widest text-black/50">Commander sur</span>
                      <span className="text-[15px] font-black text-black leading-tight">Snapchat</span>
                    </span>
                    <ArrowRight size={14} className="text-black/40 transition-transform duration-300 group-hover/s:-rotate-45" />
                  </a>
                  {/* WA */}
                  <a
                    href={whatsappUrl(perfume.name, perfume.brand)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/w flex items-center gap-3 rounded-lg border-2 px-4 active-scale transition-transform"
                    style={{ borderColor: "#25D366", backgroundColor: "rgba(37,211,102,0.07)", minHeight: 44 }}
                  >
                    <WhatsAppIcon className="h-4 w-4 shrink-0" style={{ color: "#25D366" }} />
                    <span className="flex-1 text-[13px] font-semibold text-[var(--nurea-text)]">WhatsApp</span>
                    <ArrowRight size={12} className="text-[var(--nurea-text-subtle)] transition-transform duration-300 group-hover/w:-rotate-45" />
                  </a>
                  {/* Form */}
                  <Link
                    href={contactHref(perfume.name, perfume.brand)}
                    className="flex items-center justify-center gap-1.5 py-1 text-[9px] uppercase tracking-[0.2em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors"
                  >
                    <FileText size={10} />
                    Formulaire
                  </Link>
                  <button
                    onClick={() => setActiveItem(null)}
                    aria-label="Fermer"
                    className="text-[9px] uppercase tracking-[0.3em] text-[var(--nurea-text-subtle)] hover:text-[var(--nurea-text)] transition-colors py-1 active-scale"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ── Info + toggle button ── */}
        <button
          type="button"
          id={`perfume-toggle-${perfume.id}`}
          aria-expanded={isActive}
          aria-label={`${hintLabel} — ${perfume.brand} ${perfume.name}`}
          aria-controls={isActive && !isMobile ? panelId : undefined}
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
              {isGammeComplete ? "Explorer la Gamme" : "Commander"}
            </span>
            <ArrowRight
              size={10}
              className="text-[var(--nurea-accent)] opacity-0 -translate-x-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0"
            />
          </span>
        </button>
      </article>

      {/* Mobile bottom sheet — portal to body */}
      {isActive && isMobile && mounted && (
        <PerfumeSheet perfume={perfume} onClose={() => setActiveItem(null)} />
      )}
    </>
  );
};

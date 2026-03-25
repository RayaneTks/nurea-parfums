"use client";

import type { FC, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ArrowRight } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { CONTACT, getPerfumeImage } from "@/lib/data";
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
  const isGammeComplete = perfume.category === "Gammes Compl\u00e8tes";
  const imageSrc = mounted
    ? getPerfumeImage(perfume, isDark ? "dark" : "light")
    : perfume.image;

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

  const whatsappIcon = isDark
    ? "/branding/icons/nurea_icon_whatsapp_ivory.svg"
    : "/branding/icons/nurea_icon_whatsapp_bordeaux.svg";
  const snapchatIcon = isDark
    ? "/branding/icons/nurea_icon_snapchat_ivory.svg"
    : "/branding/icons/nurea_icon_snapchat_bordeaux.svg";

  const overlayBg = "var(--nurea-overlay)";

  const getWhatsappLink = (msg: string) => {
    const num = CONTACT.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "";
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const defaultMsg = `Bonjour, je souhaite des informations sur « ${perfume.name} » de ${perfume.brand}.`;

  return (
    <article
      ref={cardRef}
      className={`group flex flex-col card-hover touch-manipulation ${
        featured ? "card-featured" : ""
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--nurea-surface)]">
        {perfume.tags && (
          <div
            data-testid="perfume-tag-strip"
            className={`absolute left-0 top-2.5 z-20 flex flex-col gap-1 transition-opacity duration-200 md:top-3 ${
              isActive ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
            aria-hidden={isActive}
          >
            {perfume.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-[var(--nurea-accent-solid)] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.18em] text-white md:text-[10px] md:px-3 md:py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Image
          src={imageSrc}
          alt={perfume.name}
          fill
          sizes={
            featured
              ? "(max-width: 768px) 100vw, 66vw"
              : "(max-width: 768px) 50vw, 33vw"
          }
          className="object-cover card-image-zoom"
          placeholder="blur"
          blurDataURL={NUREA_IMAGE_BLUR_DATA_URL}
          priority={imagePriority}
        />

        {/* Couche pointeur : ouvre/ferme sans rôle « bouton » englobant les liens */}
        <div
          className={`absolute inset-0 z-[8] md:cursor-pointer ${
            isActive ? "pointer-events-none" : ""
          }`}
          onClick={toggleActive}
          aria-hidden="true"
        />

        <div
          id={panelId}
          role="region"
          aria-hidden={!isActive}
          aria-labelledby={`perfume-toggle-${perfume.id}`}
          className={`absolute inset-0 z-[15] flex min-h-0 flex-col items-stretch justify-center p-0 sm:p-1 card-overlay ${
            isActive
              ? "opacity-100 pointer-events-auto backdrop-blur-2xl"
              : "pointer-events-none opacity-0 backdrop-blur-none md:group-hover:opacity-100 md:group-hover:backdrop-blur-2xl"
          }`}
          style={isActive ? { backgroundColor: overlayBg } : undefined}
          onMouseEnter={(e) => {
            if (window.innerWidth >= 768) {
              e.currentTarget.style.backgroundColor = overlayBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          {isGammeComplete && perfume.classics ? (
            <div className="flex h-full min-h-0 w-full flex-col items-center px-2 pb-2 pt-3 sm:px-3 sm:pb-3 sm:pt-4">
              <p className="mb-2 w-full shrink-0 text-center font-serif text-[14px] leading-snug text-[var(--nurea-text)] sm:mb-3 sm:text-[15px] md:text-lg">
                Classiques de la Maison
              </p>
              <p className="mb-3 w-full shrink-0 text-center text-[12px] leading-relaxed text-[var(--nurea-text-muted)]">
                Disponibles sur commande
              </p>
              <div className="min-h-0 w-full max-w-[280px] flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                <div className="flex flex-col gap-2 pb-1">
                  {perfume.classics.map((classic) => {
                    const msg = `Bonjour, je souhaite acquérir « ${classic} » de ${perfume.brand}.`;
                    return (
                      <a
                        key={classic}
                        href={getWhatsappLink(msg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/btn flex w-full min-h-[44px] shrink-0 items-center justify-between border border-[var(--nurea-border-hover)] px-3 py-2.5 text-[11px] uppercase tracking-nurea-label text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-accent-subtle)] hover:border-[var(--nurea-accent)] sm:px-4 sm:py-3 md:text-[12px] md:px-5"
                      >
                        <span className="min-w-0 flex-1 truncate pr-2 text-left font-medium">
                          {classic}
                        </span>
                        <ArrowRight
                          size={13}
                          className="shrink-0 text-[var(--nurea-accent)] transition-transform duration-300 group-hover/btn:-rotate-45"
                        />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[240px] flex-col gap-2.5 self-center px-3 py-2 sm:px-4">
              <p className="mb-2 text-center font-serif text-[15px] leading-snug text-[var(--nurea-text)] md:text-lg">
                Demander un conseil
              </p>
              <p className="mb-1 text-center text-[12px] leading-relaxed text-[var(--nurea-text-muted)]">
                La conciergerie vous guide vers la bonne référence — disponible sur commande.
              </p>
              <a
                href={getWhatsappLink(defaultMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[10px] font-medium uppercase tracking-nurea-wide text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-accent-subtle)] hover:border-[var(--nurea-accent)] md:text-[11px] md:px-5 md:py-3.5 min-h-[44px]"
              >
                <span className="flex items-center gap-2.5">
                  <Image
                    src={whatsappIcon}
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] shrink-0 object-contain"
                  />
                  WhatsApp
                </span>
                <ArrowRight
                  size={12}
                  className="text-[var(--nurea-accent)] transition-transform duration-300 group-hover/btn:-rotate-45"
                />
              </a>
              <a
                href={CONTACT.snapchat}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[10px] font-medium uppercase tracking-nurea-wide text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-snapchat)]/10 hover:border-[var(--nurea-snapchat)] md:text-[11px] md:px-5 md:py-3.5 min-h-[44px]"
              >
                <span className="flex items-center gap-2.5">
                  <Image
                    src={snapchatIcon}
                    alt=""
                    width={24}
                    height={24}
                    className="h-7 w-7 shrink-0 object-contain"
                  />
                  Snapchat
                </span>
                <ArrowRight
                  size={12}
                  className="text-[var(--nurea-text-muted)] transition-transform duration-300 group-hover/btn:-rotate-45"
                />
              </a>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        id={`perfume-toggle-${perfume.id}`}
        aria-expanded={isActive}
        aria-controls={panelId}
        className="flex w-full flex-col border-0 bg-transparent p-0 pt-3 text-left text-[var(--nurea-text)] outline-none md:pt-3.5"
        onClick={toggleActive}
        onKeyDown={onToggleKeyDown}
      >
        <span className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.25em] text-[var(--nurea-accent)] md:text-[10px]">
          {perfume.brand}
        </span>
        <span className="font-serif text-[15px] leading-snug md:text-[17px]">
          {perfume.name}
        </span>
        <span className="mt-1.5 text-[11px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-accent)] md:text-[11px]">
          {isGammeComplete
            ? "Découvrir la gamme \u2192 Sur commande"
            : "Demander un conseil \u2192 Sur commande"}
        </span>
      </button>
    </article>
  );
};

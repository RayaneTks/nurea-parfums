"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ArrowRight } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { CONTACT } from "@/lib/data";

interface PerfumeCardProps {
  perfume: Perfume;
  activeItem: number | null;
  setActiveItem: (id: number | null) => void;
  featured?: boolean;
}

export const PerfumeCard: FC<PerfumeCardProps> = ({
  perfume,
  activeItem,
  setActiveItem,
  featured = false,
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  const isActive = activeItem === perfume.id;
  const isGammeComplete = perfume.category === "Gammes Compl\u00e8tes";

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
    <div
      className={`group flex flex-col cursor-pointer card-hover ${
        featured ? "card-featured" : ""
      }`}
      onClick={() => setActiveItem(isActive ? null : perfume.id)}
      onMouseLeave={() => setActiveItem(null)}
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--nurea-surface)]">
        {/* Tags */}
        {perfume.tags && (
          <div className="absolute left-0 top-2.5 z-20 flex flex-col gap-1 md:top-3">
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
          src={perfume.image}
          alt={perfume.name}
          fill
          sizes={
            featured
              ? "(max-width: 768px) 100vw, 66vw"
              : "(max-width: 768px) 50vw, 33vw"
          }
          className="object-cover card-image-zoom"
        />

        {/* Overlay CTA */}
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center p-4 card-overlay ${
            isActive
              ? "opacity-100 pointer-events-auto backdrop-blur-2xl"
              : "opacity-0 pointer-events-none backdrop-blur-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:backdrop-blur-2xl"
          }`}
          style={
            isActive
              ? { backgroundColor: overlayBg }
              : undefined
          }
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
            <div className="w-full flex h-full flex-col justify-center max-w-[260px]">
              <p className="mb-3 text-center font-serif text-base text-[var(--nurea-text)] md:text-lg">
                Classiques de la Maison
              </p>
              <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-[260px]">
                {perfume.classics.map((classic) => {
                  const msg = `Bonjour, je souhaite acquerir « ${classic} » de ${perfume.brand}.`;
                  return (
                    <a
                      key={classic}
                      href={getWhatsappLink(msg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[11px] uppercase tracking-[0.12em] text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-accent-subtle)] hover:border-[var(--nurea-accent)] md:text-[12px] md:px-5 md:py-3.5 min-h-[44px]"
                    >
                      <span className="truncate pr-2 font-medium">
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
          ) : (
            <div className="w-full flex flex-col gap-2.5 max-w-[240px]">
              <p className="mb-2 text-center font-serif text-base text-[var(--nurea-text)] md:text-lg">
                Acquerir cette creation
              </p>
              <a
                href={getWhatsappLink(defaultMsg)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-accent-subtle)] hover:border-[var(--nurea-accent)] md:text-[11px] md:px-5 md:py-3.5 min-h-[44px]"
              >
                <span className="flex items-center gap-2.5">
                  <Image
                    src={whatsappIcon}
                    alt=""
                    width={20}
                    height={20}
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
                onClick={(e) => e.stopPropagation()}
                className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-snapchat)]/10 hover:border-[var(--nurea-snapchat)] md:text-[11px] md:px-5 md:py-3.5 min-h-[44px]"
              >
                <span className="flex items-center gap-2.5">
                  <Image
                    src={snapchatIcon}
                    alt=""
                    width={20}
                    height={20}
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

      {/* Info */}
      <div className="flex flex-col pt-3 md:pt-3.5">
        <span className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.25em] text-[var(--nurea-accent)] md:text-[10px]">
          {perfume.brand}
        </span>
        <h3 className="font-serif text-[14px] text-[var(--nurea-text)] leading-tight md:text-[17px]">
          {perfume.name}
        </h3>
        <span className="mt-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-accent)] md:text-[11px]">
          {isGammeComplete ? "Decouvrir la gamme \u2192" : "Demander \u2192"}
        </span>
      </div>
    </div>
  );
};

"use client";

import type { FC } from "react";
import Image from "next/image";
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
  const isActive = activeItem === perfume.id;
  const isGammeComplete = perfume.category === "Gammes Compl\u00e8tes";

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
                className="inline-block bg-[var(--nurea-accent-solid)] px-2 py-0.5 text-[7px] font-medium uppercase tracking-[0.18em] text-white md:text-[8px] md:px-2.5 md:py-1"
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
              ? "opacity-100 pointer-events-auto backdrop-blur-xl bg-[var(--nurea-bg)]/85"
              : "opacity-0 pointer-events-none backdrop-blur-none bg-transparent md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:backdrop-blur-xl md:group-hover:bg-[var(--nurea-bg)]/85"
          }`}
        >
          {isGammeComplete && perfume.classics ? (
            <div className="w-full flex h-full flex-col justify-center max-w-[260px]">
              <p className="mb-4 text-center font-serif text-sm text-[var(--nurea-text)] md:text-base">
                Classiques de la Maison
              </p>
              <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar max-h-[240px]">
                {perfume.classics.map((classic) => {
                  const msg = `Bonjour, je souhaite acquerir « ${classic} » de ${perfume.brand}.`;
                  return (
                    <a
                      key={classic}
                      href={getWhatsappLink(msg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-accent-subtle)] hover:border-[var(--nurea-accent)] md:text-[9px] md:px-4 md:py-2.5"
                    >
                      <span className="truncate pr-2 font-medium">
                        {classic}
                      </span>
                      <ArrowRight
                        size={10}
                        className="shrink-0 text-[var(--nurea-accent)] transition-transform duration-300 group-hover/btn:-rotate-45"
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2 max-w-[240px]">
              <p className="mb-2 text-center font-serif text-sm text-[var(--nurea-text)] md:text-base">
                Acquerir cette creation
              </p>
              <a
                href={getWhatsappLink(defaultMsg)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[9px] font-medium uppercase tracking-[0.15em] text-[var(--nurea-text)] transition-all duration-300 hover:bg-[var(--nurea-accent-subtle)] hover:border-[var(--nurea-accent)] md:text-[10px] md:px-5 md:py-3.5"
              >
                <span className="flex items-center gap-2.5">
                  <Image
                    src="/branding/icons/nurea_icon_whatsapp_ivory.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="opacity-80"
                  />
                  WhatsApp
                </span>
                <ArrowRight
                  size={10}
                  className="text-[var(--nurea-accent)] transition-transform duration-300 group-hover/btn:-rotate-45"
                />
              </a>
              <a
                href={CONTACT.snapchat}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/btn flex w-full items-center justify-between border border-[var(--nurea-border-hover)] px-4 py-3 text-[9px] font-medium uppercase tracking-[0.15em] text-[var(--nurea-text)] transition-all duration-300 hover:bg-[#FFD100]/10 hover:border-[#FFD100] md:text-[10px] md:px-5 md:py-3.5"
              >
                <span className="flex items-center gap-2.5">
                  <Image
                    src="/branding/icons/nurea_icon_snapchat_ivory.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="opacity-80"
                  />
                  Snapchat
                </span>
                <ArrowRight
                  size={10}
                  className="text-[var(--nurea-text-muted)] transition-transform duration-300 group-hover/btn:-rotate-45"
                />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col pt-2.5 md:pt-3">
        <span className="mb-0.5 text-[7px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[8px]">
          {perfume.brand}
        </span>
        <h3 className="font-serif text-[13px] text-[var(--nurea-text)] leading-tight md:text-[16px]">
          {perfume.name}
        </h3>
        <span className="mt-1 text-[9px] uppercase tracking-[0.12em] text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-accent)] md:text-[10px]">
          {isGammeComplete ? "Decouvrir la gamme \u2192" : "Demander \u2192"}
        </span>
      </div>
    </div>
  );
};

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
}

export const PerfumeCard: FC<PerfumeCardProps> = ({
  perfume,
  activeItem,
  setActiveItem,
}) => {
  const isActive = activeItem === perfume.id;
  const isGammeComplete = perfume.category === "Gammes Complètes";

  const getWhatsappLink = (messageText: string) => {
    return `https://wa.me/${CONTACT.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? ""}?text=${encodeURIComponent(
      messageText
    )}`;
  };

  const defaultMessage = `Bonjour, je souhaite des informations sur « ${perfume.name} » de ${perfume.brand}.`;

  return (
    <div
      className="group flex cursor-pointer flex-col"
      onClick={() => setActiveItem(isActive ? null : perfume.id)}
      onMouseLeave={() => setActiveItem(null)}
    >
      <div className="relative mb-6 aspect-[3/4] overflow-hidden bg-[#F5F4F0] dark:bg-[#141414]">
        {perfume.tags && (
          <div className="absolute left-4 top-4 z-20">
            {perfume.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#222222] dark:text-[#FDFCF8]"
              >
                • {tag}
              </span>
            ))}
          </div>
        )}

        <Image
          src={perfume.image}
          alt={perfume.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
        />

        {/* Hover / Click Overlay */}
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#FDFCF8]/95 p-8 backdrop-blur-md transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-[#0A0A0A]/95 ${
            isActive
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-8 opacity-0 pointer-events-none md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
          }`}
        >
          {isGammeComplete && perfume.classics ? (
            /* Layout spécial pour les Gammes Complètes */
            <div className="w-full flex h-full flex-col justify-center">
              <p className="mb-8 text-center font-serif text-xl tracking-wide text-[#222222] dark:text-[#FDFCF8]">
                Classiques de la Maison
              </p>
              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pb-4">
                {perfume.classics.map((classic) => {
                  const classicMsg = `Bonjour, je souhaite acquérir « ${classic} » de ${perfume.brand}.`;
                  return (
                    <a
                      key={classic}
                      href={getWhatsappLink(classicMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group/btn flex w-full items-center justify-between border border-[#222222]/20 px-5 py-3 text-xs uppercase tracking-[0.1em] text-[#222222] transition-all hover:border-[#222222] hover:bg-[#222222] hover:text-[#FDFCF8] dark:border-[#FDFCF8]/20 dark:text-[#FDFCF8] dark:hover:border-[#FDFCF8] dark:hover:bg-[#FDFCF8] dark:hover:text-[#0A0A0A]"
                    >
                      <span className="truncate pr-4 font-medium">
                        {classic}
                      </span>
                      <ArrowRight
                        size={14}
                        className="shrink-0 transition-transform duration-300 group-hover/btn:-rotate-45"
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Layout Standard (Sélections Individuelles / Nouveautés) */
            <div className="w-full flex flex-col gap-4">
              <p className="mb-4 text-center font-serif text-xl text-[#222222] dark:text-[#FDFCF8]">
                Acquérir cette création
              </p>
              <a
                href={getWhatsappLink(defaultMessage)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/btn flex w-full items-center justify-between bg-[#222222] px-6 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#FDFCF8] transition-colors hover:bg-[#8C7A6B] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#C29B62]"
              >
                WhatsApp
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover/btn:-rotate-45"
                />
              </a>
              <a
                href={CONTACT.snapchat}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/btn flex w-full items-center justify-between bg-[#222222] px-6 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#FDFCF8] transition-colors hover:bg-[#FFD100] hover:text-[#0A0A0A] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#FFD100]"
              >
                Snapchat
                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover/btn:-rotate-45"
                />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col text-center">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8C7A6B] dark:text-[#C29B62]">
          {perfume.brand}
        </p>
        <h3 className="mb-2 font-serif text-2xl text-[#222222] md:text-3xl dark:text-[#FDFCF8]">
          {perfume.name}
        </h3>
        <span className="mt-auto inline-block text-xs uppercase tracking-widest text-[#888888] transition-colors duration-500 group-hover:text-[#8C7A6B] dark:text-[#A0A0A0] dark:group-hover:text-[#C29B62]">
          {isGammeComplete ? "Découvrir la gamme →" : "Demander la disponibilité →"}
        </span>
      </div>
    </div>
  );
};

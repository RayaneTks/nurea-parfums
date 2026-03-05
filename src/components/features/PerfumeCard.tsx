"use client";

import type { FC } from "react";
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

  return (
    <div
      className="group flex cursor-pointer flex-col"
      onClick={() => setActiveItem(isActive ? null : perfume.id)}
      onMouseLeave={() => setActiveItem(null)}
    >
      <div className="relative mb-6 aspect-[3/4] overflow-hidden bg-[#F5F4F0]">
        {perfume.tags && (
          <div className="absolute left-4 top-4 z-20">
            {perfume.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#111111] dark:text-[#FDFCF8]"
              >
                • {tag}
              </span>
            ))}
          </div>
        )}

        <img
          src={perfume.image}
          alt={perfume.name}
          className="h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
        />

        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#FDFCF8]/90 p-8 backdrop-blur-sm transition-all duration-500 ease-out dark:bg-[#0A0A0A]/90 ${
            isActive
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-4 opacity-0 pointer-events-none md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
          }`}
        >
          <p className="mb-4 text-center font-serif text-xl">
            Acquérir cette création
          </p>
          <a
            href={CONTACT.whatsapp}
            className="flex w-full items-center justify-between bg-[#111111] px-6 py-4 text-xs uppercase tracking-[0.15em] text-[#FDFCF8] transition-colors hover:bg-[#8C7A6B] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#C29B62]"
          >
            Via WhatsApp <ArrowRight size={14} />
          </a>
          <a
            href={CONTACT.snapchat}
            className="flex w-full items-center justify-between border border-[#111111] bg-transparent px-6 py-4 text-xs uppercase tracking-[0.15em] text-[#111111] transition-colors hover:bg-[#F5F4F0] dark:border-[#FDFCF8] dark:text-[#FDFCF8] dark:hover:bg-[#141414]"
          >
            Via Snapchat <ArrowRight size={14} />
          </a>
        </div>
      </div>

      <div className="flex flex-1 flex-col text-center">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8C7A6B] dark:text-[#C29B62]">
          {perfume.brand}
        </p>
        <h3 className="mb-2 font-serif text-2xl text-[#111111] md:text-3xl dark:text-[#FDFCF8]">
          {perfume.name}
        </h3>
        <p className="mt-auto text-xs uppercase tracking-widest text-[#888888] dark:text-[#A0A0A0]">
          Disponibilité sur demande
        </p>
      </div>
    </div>
  );
};

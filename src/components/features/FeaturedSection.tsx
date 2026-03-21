"use client";

import type { FC } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { CONTACT } from "@/lib/data";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface FeaturedSectionProps {
  perfumes: Perfume[];
}

export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => {
  const getWhatsappLink = (msg: string) => {
    const num = CONTACT.whatsapp.match(/wa\.me\/(\d+)/)?.[1] ?? "";
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <section className="w-full">
      {perfumes.map((perfume, index) => {
        const msg = `Bonjour, je souhaite des informations sur « ${perfume.name} » de ${perfume.brand}.`;
        const isReverse = index % 2 !== 0;

        return (
          <div
            key={perfume.id}
            className={`editorial-split ${isReverse ? "reverse" : ""}`}
          >
            {/* Image */}
            <ScrollReveal
              direction={isReverse ? "right" : "left"}
              className="relative min-h-[55vh] md:min-h-[70vh] overflow-hidden"
            >
              <Image
                src={perfume.image}
                alt={perfume.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={index === 0}
              />
              {perfume.tags && (
                <div className="absolute left-3 top-3 z-10 md:left-4 md:top-4">
                  {perfume.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-[var(--nurea-accent-solid)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white md:text-[11px] md:px-3.5 md:py-1.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </ScrollReveal>

            {/* Content */}
            <ScrollReveal
              direction={isReverse ? "left" : "right"}
              delay={120}
              className="flex flex-col justify-center bg-[var(--nurea-surface)] px-6 py-12 md:px-14 md:py-20 lg:px-20"
            >
              <span className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
                {perfume.brand}
              </span>
              <h2 className="mb-5 font-serif text-[clamp(26px,4vw,42px)] leading-[1.08] text-[var(--nurea-text)]">
                {perfume.name.split(" ").length > 2 ? (
                  <>
                    {perfume.name.split(" ").slice(0, -1).join(" ")}
                    <br />
                    <em style={{ fontStyle: "italic" }}>
                      {perfume.name.split(" ").slice(-1)}
                    </em>
                  </>
                ) : (
                  perfume.name
                )}
              </h2>
              <p className="mb-8 text-[13px] leading-[1.85] text-[var(--nurea-text-muted)] max-w-[360px] md:text-[14px]">
                Une fragrance d&apos;exception selectionnee pour sa singularite
                et son caractere. Disponible sur commande exclusive.
              </p>
              <a
                href={getWhatsappLink(msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-nurea w-fit group"
              >
                Acquerir cette creation
                <ArrowRight
                  size={13}
                  className="text-[var(--nurea-accent)] transition-transform duration-300 group-hover:-rotate-45"
                />
              </a>
            </ScrollReveal>
          </div>
        );
      })}
    </section>
  );
};

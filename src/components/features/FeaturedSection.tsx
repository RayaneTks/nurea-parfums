"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowRight } from "lucide-react";
import type { Perfume } from "@/lib/data";
import { getPerfumeImage } from "@/lib/data";
import { NUREA_IMAGE_BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface FeaturedSectionProps {
  perfumes: Perfume[];
}

export const FeaturedSection: FC<FeaturedSectionProps> = ({ perfumes }) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeTheme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <section className="w-full">
      {perfumes.map((perfume, index) => {
        const isReverse = index % 2 !== 0;

        return (
          <div
            key={perfume.id}
            className={`editorial-split ${isReverse ? "reverse" : ""}`}
          >
            <ScrollReveal
              direction={isReverse ? "right" : "left"}
              className="relative min-h-[42vh] overflow-hidden md:min-h-[70vh]"
            >
              <Image
                src={
                  mounted ? getPerfumeImage(perfume, activeTheme) : perfume.image
                }
                alt={`${perfume.brand} - ${perfume.name}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={index === 0}
                fetchPriority={index === 0 ? "high" : "auto"}
                quality={85}
                placeholder="blur"
                blurDataURL={NUREA_IMAGE_BLUR_DATA_URL}
              />
              {perfume.tags && (
                <div className="absolute left-3 top-3 z-10 md:left-4 md:top-4">
                  {perfume.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-[var(--nurea-accent-solid)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white md:px-3.5 md:py-1.5 md:text-[11px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </ScrollReveal>

            <ScrollReveal
              direction={isReverse ? "left" : "right"}
              delay={120}
              className="flex min-h-[42vh] flex-col justify-center bg-[var(--nurea-surface)] px-6 py-12 md:min-h-[70vh] md:px-14 md:py-24 lg:px-20"
            >
              <span className="mb-3 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)] md:text-[12px]">
                Signature du Moment
              </span>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--nurea-text-muted)]">
                {perfume.brand}
              </p>
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
              <p className="mb-8 max-w-[420px] text-[15px] leading-[1.75] text-[var(--nurea-text-muted)] md:text-[14px] md:leading-[1.85]">
                Une pièce maîtresse de notre sélection privée. Chaque sillage exposé témoigne de notre exigence ; sollicitez la Maison pour en faire votre empreinte personnelle.
              </p>
              <Link href="/contact" className="btn-nurea group w-fit">
                Engager le Dialogue
                <ArrowRight
                  size={13}
                  className="text-[var(--nurea-accent)] transition-transform duration-300 group-hover:-rotate-45"
                />
              </Link>
            </ScrollReveal>
          </div>
        );
      })}
    </section>
  );
};

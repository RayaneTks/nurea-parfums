"use client";

import type { FC, MouseEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";

export const Hero: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const handleScrollToCollection = (
    event: MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();

    const section = document.getElementById("collection");
    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.pushState(null, "", "#collection");
  };

  return (
    <header className="relative flex min-h-[90vh] items-center justify-center px-6 pt-20 md:min-h-screen">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/branding/bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={`object-cover transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isDark
              ? "opacity-20 grayscale-[20%] mix-blend-lighten"
              : "opacity-[0.15] grayscale-[50%] mix-blend-multiply"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FDFCF8]/60 to-[#FDFCF8] transition-colors duration-1000 dark:via-[#0A0A0A]/80 dark:to-[#0A0A0A]" />
      </div>

      <div className="relative z-10 mt-12 flex max-w-4xl flex-col items-center text-center md:mt-0">
        <span className="mb-6 block text-xs uppercase tracking-[0.4em] text-[#8C7A6B] animate-[fadeInUp_1s_ease-out] md:text-sm dark:text-[#C29B62]">
          Maison de Haute Parfumerie
        </span>
        <h1 className="mb-8 font-serif text-5xl font-light leading-[1.1] text-[#222222] animate-[fadeInUp_1.2s_ease-out] md:text-7xl lg:text-8xl dark:text-[#FDFCF8]">
          L&apos;Élégance de <br className="hidden md:block" />
          <span className="italic text-[#8C7A6B] dark:text-[#C29B62]">
            l&apos;Invisible.
          </span>
        </h1>
        <p className="mb-12 max-w-md text-sm leading-relaxed text-[#888888] animate-[fadeInUp_1.4s_ease-out] md:text-base dark:text-[#A0A0A0]">
          Une sélection privée de créations d&apos;exception.
          Des grandes Maisons aux nez les plus confidentiels,
          chaque fragrance est une invitation au voyage.
        </p>
        <a
          href="#collection"
          onClick={handleScrollToCollection}
          className="group flex h-16 w-16 items-center justify-center rounded-full border border-[#222222] text-[#222222] transition-all duration-500 hover:bg-[#222222] hover:text-[#FDFCF8] animate-[fadeInUp_1.6s_ease-out] dark:border-[#FDFCF8] dark:text-[#FDFCF8] dark:hover:bg-[#FDFCF8] dark:hover:text-[#0A0A0A]"
          aria-label="Descendre vers la collection"
        >
          <ArrowRight
            size={20}
            className="transition-transform duration-500 group-hover:translate-y-1 group-hover:rotate-90"
          />
        </a>
      </div>
    </header>
  );
};

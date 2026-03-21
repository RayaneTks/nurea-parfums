"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState, type FC } from "react";
import { CONTACT } from "@/lib/data";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const Footer: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <footer className="relative mt-auto border-t border-[var(--nurea-border)] bg-[var(--nurea-bg)]">
      {/* Top accent line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[1px] w-[50%] bg-gradient-to-r from-transparent via-[var(--nurea-accent)] to-transparent opacity-15" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-20">
        {/* Monogram */}
        <ScrollReveal direction="scale" className="flex flex-col items-center gap-6 mb-12">
          {mounted && (
            <Image
              src={
                isDark
                  ? "/branding/monogram/np-circle-cuivre.png"
                  : "/branding/monogram/np-circle-bordeaux.png"
              }
              alt="Nurea Parfums"
              width={72}
              height={72}
              className="h-[72px] w-[72px] opacity-45 transition-opacity duration-500 hover:opacity-70"
            />
          )}
          <Image
            src="/branding/separators/nurea_separator_copper.svg"
            alt=""
            width={120}
            height={12}
            className="max-w-[140px] opacity-25"
          />
        </ScrollReveal>

        {/* Social links */}
        <ScrollReveal className="flex items-center justify-center gap-12 mb-12" delay={80}>
          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-2 transition-all duration-300"
            aria-label="WhatsApp"
          >
            <span className="flex h-16 w-16 items-center justify-center border border-[var(--nurea-border-hover)] transition-all duration-300 group-hover:border-[var(--nurea-accent)] group-hover:bg-[var(--nurea-accent-subtle)]">
              <Image
                src={
                  isDark
                    ? "/branding/icons/nurea_icon_whatsapp_ivory.svg"
                    : "/branding/icons/nurea_icon_whatsapp_bordeaux.svg"
                }
                alt="WhatsApp"
                width={26}
                height={26}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-accent)] md:text-[11px]">
              WhatsApp
            </span>
          </a>

          <a
            href={CONTACT.snapchat}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-2 transition-all duration-300"
            aria-label="Snapchat"
          >
            <span className="flex h-16 w-16 items-center justify-center border border-[var(--nurea-border-hover)] transition-all duration-300 group-hover:border-[#FFD100] group-hover:bg-[#FFD100]/5">
              <Image
                src={
                  isDark
                    ? "/branding/icons/nurea_icon_snapchat_ivory.svg"
                    : "/branding/icons/nurea_icon_snapchat_bordeaux.svg"
                }
                alt="Snapchat"
                width={26}
                height={26}
                className="transition-transform duration-300 group-hover:scale-110"
              />
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[#FFD100] md:text-[11px]">
              Snapchat
            </span>
          </a>
        </ScrollReveal>

        {/* Navigation & text */}
        <ScrollReveal className="flex flex-col items-center gap-4 text-center" delay={160}>
          <p className="font-serif text-sm italic text-[var(--nurea-text-muted)] md:text-base">
            Maison de Haute Parfumerie
          </p>

          <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] md:text-[12px]">
            <Link
              href="/"
              className="transition-colors duration-300 hover:text-[var(--nurea-accent)] py-1"
            >
              Collection
            </Link>
            <span className="h-3 w-[1px] bg-[var(--nurea-border-hover)]" />
            <Link
              href="/contact"
              className="transition-colors duration-300 hover:text-[var(--nurea-accent)] py-1"
            >
              Contact
            </Link>
          </div>

          <p className="mt-1 text-[10px] tracking-[0.12em] text-[var(--nurea-text-subtle)]">
            &copy; {new Date().getFullYear()} Nurea Parfums. Tous droits
            reserves.
          </p>
        </ScrollReveal>
      </div>
    </footer>
  );
};

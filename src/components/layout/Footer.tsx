"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState, type FC } from "react";
import { CONTACT } from "@/lib/data";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { WhatsAppIcon, SnapchatIcon } from "@/components/ui/Icons";

export const Footer: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme !== "light";

  return (
    <footer className="relative mt-auto border-t border-[var(--nurea-border)] bg-[var(--nurea-bg)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[1px] w-[50%] bg-gradient-to-r from-transparent via-[var(--nurea-accent)] to-transparent opacity-15" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-10 md:py-20">
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
            className="h-auto w-auto max-w-[140px] opacity-25"
          />
        </ScrollReveal>

        <ScrollReveal className="mb-12" delay={80}>
          <div className="mx-auto grid max-w-lg grid-cols-2 items-start justify-items-center gap-x-6 sm:gap-x-10">
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full max-w-[150px] flex-col items-center gap-2 text-center transition-all duration-300 active:scale-[0.97]"
              aria-label="WhatsApp"
            >
              <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-all duration-300 group-hover:border-[var(--nurea-accent)] group-hover:bg-[var(--nurea-accent-subtle)]">
                <WhatsAppIcon className="h-6 w-6 text-[var(--nurea-text)] transition-colors group-hover:text-[var(--nurea-accent)]" />
              </span>
              <span className="text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-accent)] md:text-[11px]">
                WhatsApp
              </span>
              <span
                className="min-h-[1.125rem] w-full shrink-0"
                aria-hidden
              />
            </a>

            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full max-w-[150px] flex-col items-center gap-2 text-center transition-all duration-300 active:scale-[0.97]"
              aria-label="Snapchat"
            >
              <span className="flex h-[64px] w-[64px] shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-all duration-300 group-hover:border-[var(--nurea-snapchat)] group-hover:bg-[var(--nurea-snapchat)]/5">
                <SnapchatIcon className="h-6 w-6 text-[var(--nurea-text)] transition-colors group-hover:text-[var(--nurea-snapchat)]" />
              </span>
              <span className="text-[10px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] transition-colors duration-300 group-hover:text-[var(--nurea-snapchat)] md:text-[11px]">
                Snapchat
              </span>
              <span className="text-[9px] leading-tight tracking-nurea-tight text-[var(--nurea-text-subtle)] md:text-[10px]">
                {CONTACT.snapchatHandle}
              </span>
            </a>
          </div>
        </ScrollReveal>

        <ScrollReveal className="flex flex-col items-center gap-4 text-center" delay={160}>
          <p className="font-serif text-sm italic text-[var(--nurea-text-muted)] md:text-base">
            Maison de Haute Parfumerie
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-nurea-label text-[var(--nurea-text-muted)] md:text-[12px]">
            <Link
              href="/"
              className="transition-colors duration-300 hover:text-[var(--nurea-accent)] py-1"
            >
              Collection
            </Link>
            <Link
              href="/marque"
              className="transition-colors duration-300 hover:text-[var(--nurea-accent)] py-1"
            >
              Marque
            </Link>
            <Link
              href="/contact"
              className="transition-colors duration-300 hover:text-[var(--nurea-accent)] py-1"
            >
              Contact
            </Link>
          </div>

          <p className="mt-1 text-[10px] tracking-nurea-label text-[var(--nurea-text-subtle)]">
            &copy; {new Date().getFullYear()} Nurea Parfums. Tous droits
            réservés.
          </p>
        </ScrollReveal>
      </div>
    </footer>
  );
};

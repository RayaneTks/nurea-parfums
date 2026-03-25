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
            className="max-w-[140px] opacity-25"
            style={{ height: "auto" }}
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-12 md:gap-y-10 mb-12">
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">
              Navigation
            </p>
            <nav className="flex flex-col gap-2.5 text-[13px]">
              <Link
                href="/"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                Collection
              </Link>
              <Link
                href="/marque"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                Notre marque
              </Link>
              <Link
                href="/contact"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                Conciergerie
              </Link>
            </nav>
          </div>

          <div>
            <p className="mb-4 text-[11px] uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">
              Conciergerie
            </p>
            <nav className="flex flex-col gap-2.5 text-[13px]">
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)] inline-flex items-center gap-2"
              >
                <span className="h-6 w-6 inline-flex items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]">
                  <Image
                    src={
                      isDark
                        ? "/branding/icons/nurea_icon_whatsapp_ivory.svg"
                        : "/branding/icons/nurea_icon_whatsapp_bordeaux.svg"
                    }
                    alt=""
                    width={18}
                    height={18}
                    className="h-4 w-4 object-contain"
                  />
                </span>
                <span>WhatsApp</span>
              </a>
              <a
                href={CONTACT.snapchat}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)] inline-flex items-center gap-2"
              >
                <span className="h-6 w-6 inline-flex items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]">
                  <Image
                    src={
                      isDark
                        ? "/branding/icons/nurea_icon_snapchat_ivory.svg"
                        : "/branding/icons/nurea_icon_snapchat_bordeaux.svg"
                    }
                    alt=""
                    width={20}
                    height={20}
                    className="h-4 w-4 object-contain"
                  />
                </span>
                <span>Snapchat</span>
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                {CONTACT.email}
              </a>
            </nav>
          </div>

          <div>
            <p className="mb-4 text-[11px] uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">
              Réassurance
            </p>
            <p className="text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
              Catalogue sur commande : une demande claire, un accompagnement
              sur-mesure.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
              Aucun message n’est stocké sur ce site.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--nurea-text-muted)]">
              Confidentialité : aucune copie n’est stockée sur ce site.
            </p>
          </div>

          <div>
            <p className="mb-4 text-[11px] uppercase tracking-nurea-wide text-[var(--nurea-text-muted)]">
              Pages
            </p>
            <nav className="flex flex-col gap-2.5 text-[13px]">
              <Link
                href="/marque"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                Notre marque
              </Link>
              <Link
                href="/contact"
                className="transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                Démarrer une demande
              </Link>
            </nav>

            <div className="mt-6 text-[11px] uppercase tracking-nurea-label text-[var(--nurea-text-subtle)]">
              Maison de Haute Parfumerie
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-[var(--nurea-border)] pt-6 md:flex-row md:justify-between">
          <p className="text-[10px] tracking-nurea-label text-[var(--nurea-text-subtle)]">
            &copy; {new Date().getFullYear()} Nurea Parfums. Tous droits réservés.
          </p>
          <div className="text-[11px] uppercase tracking-nurea-label text-[var(--nurea-text-subtle)]">
            Catalogue sur commande • Conciergerie WhatsApp
          </div>
        </div>
      </div>
    </footer>
  );
};

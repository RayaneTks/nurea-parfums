"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState, type FC } from "react";
import { CONTACT } from "@/lib/data";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { WhatsAppIcon, SnapchatIcon } from "@/components/ui/Icons";
import { Instagram, Mail, MapPin } from "lucide-react";

export const Footer: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [year, setYear] = useState(2026); // Fallback to current year in context

  useEffect(() => {
    setMounted(true);
    setYear(new Date().getFullYear());
  }, []);

  const isDark = resolvedTheme !== "light";

  return (
    <footer className="relative border-t border-[var(--nurea-border)] bg-[var(--nurea-bg)] pt-16 pb-8 md:pt-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-10">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Brand & Mission */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            <Link href="/" className="inline-block transition-opacity hover:opacity-80">
              {mounted && (
                <Image
                  src={
                    isDark
                      ? "/branding/logos/nurea_logo_white.svg"
                      : "/branding/logos/nurea_logo_black.svg"
                  }
                  alt="Nuréa Parfums"
                  width={140}
                  height={40}
                  className="h-10 w-auto"
                />
              )}
            </Link>
            <p className="max-w-xs text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
              Maison de Haute Parfumerie dédiée à l&apos;art de la séduction et à l&apos;exception olfactive. Une sélection rigoureuse des plus grandes références mondiales.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href={CONTACT.whatsapp} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--nurea-border)] text-[var(--nurea-text-muted)] transition-all hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] active:scale-95"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
              </a>
              <a 
                href={CONTACT.snapchat} 
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--nurea-border)] text-[var(--nurea-text-muted)] transition-all hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] active:scale-95"
                aria-label="Snapchat"
              >
                <SnapchatIcon className="h-[18px] w-[18px]" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              Navigation
            </h3>
            <ul className="flex flex-col gap-3 text-[14px] text-[var(--nurea-text-muted)]">
              <li><Link href="/" className="transition-colors hover:text-[var(--nurea-text)]">La Galerie</Link></li>
              <li><Link href="/marque" className="transition-colors hover:text-[var(--nurea-text)]">La Maison</Link></li>
              <li><Link href="/contact" className="transition-colors hover:text-[var(--nurea-text)]">Contact & Conseils</Link></li>
              <li><Link href="/admin" className="transition-colors hover:text-[var(--nurea-text)] text-[10px] opacity-80">Accès Réservé</Link></li>
            </ul>
          </div>

          {/* Contact Direct */}
          <div className="flex flex-col gap-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              Contact
            </h3>
            <ul className="flex flex-col gap-4 text-[14px] text-[var(--nurea-text-muted)]">
              <li className="flex items-start gap-3">
                <Mail size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--nurea-accent)]" />
                <a href={`mailto:${CONTACT.email}`} className="transition-colors hover:text-[var(--nurea-text)]">
                  {CONTACT.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--nurea-accent)]" />
                <span>Basé à Marseille & alentours. Envoi possible sur demande.</span>
              </li>
            </ul>
          </div>

          {/* Informations Légales */}
          <div className="flex flex-col gap-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--nurea-accent)]">
              Légal
            </h3>
            <ul className="flex flex-col gap-3 text-[14px] text-[var(--nurea-text-muted)]">
              <li><Link href="/legal" className="transition-colors hover:text-[var(--nurea-text)]">Mentions Légales</Link></li>
              <li><Link href="/legal" className="transition-colors hover:text-[var(--nurea-text)]">Politique de Confidentialité</Link></li>
              <li><Link href="/legal" className="transition-colors hover:text-[var(--nurea-text)]">CGV / CGU</Link></li>
              <li><Link href="/legal" className="transition-colors hover:text-[var(--nurea-text)]">Livraison & Retours</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[var(--nurea-border)] pt-8 text-[11px] text-[var(--nurea-text-subtle)] md:flex-row md:mt-24">
          <p>© {year} Nuréa Parfums. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              Service Client Actif
            </span>
            <p className="uppercase tracking-widest opacity-80">Marseille</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

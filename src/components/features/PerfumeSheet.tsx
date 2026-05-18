"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { X, ArrowRight, FileText, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import type { Perfume } from "@/lib/data";
import { getPerfumeImage, CONTACT } from "@/lib/data";
import { NUREA_IMAGE_BLUR_DATA_URL } from "@/lib/blurPlaceholder";
import { SnapchatIcon, WhatsAppIcon } from "@/components/ui/Icons";

/* ─── URL helpers ─────────────────────────────────────────── */

function snapUrl() {
  return CONTACT.snapchat;
}

function whatsappUrl(parfum: string, marque: string) {
  const base = CONTACT.whatsapp.split("?")[0] ?? CONTACT.whatsapp;
  const msg = `Bonjour ! Je souhaite commander le parfum *${parfum}* de *${marque}* 🌹`;
  return `${base}?text=${encodeURIComponent(msg)}`;
}

function contactHref(parfum: string, marque: string) {
  return `/contact?parfum=${encodeURIComponent(parfum)}&marque=${encodeURIComponent(marque)}`;
}

/* ─── Sub-components ──────────────────────────────────────── */

function SnapBtn({ href, label }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center gap-4 rounded-2xl px-5 py-0 active:scale-[0.97] transition-transform touch-manipulation"
      style={{ backgroundColor: "#FFFC00", minHeight: 68 }}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/10">
        <SnapchatIcon className="h-6 w-6 text-black" />
      </span>
      <span className="flex flex-col flex-1 text-left">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-black/50">
          {label ?? "Commander sur"}
        </span>
        <span className="font-black text-[20px] leading-tight text-black">
          Snapchat
        </span>
      </span>
      <ArrowRight
        size={18}
        className="shrink-0 text-black/40 transition-transform duration-300 group-hover:-rotate-45"
      />
    </a>
  );
}

function WaBtn({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full items-center gap-4 rounded-xl border-2 px-5 active:scale-[0.97] transition-transform touch-manipulation"
      style={{ borderColor: "#25D366", minHeight: 56, backgroundColor: "rgba(37,211,102,0.07)" }}
    >
      <WhatsAppIcon className="h-5 w-5 shrink-0" style={{ color: "#25D366" }} />
      <span className="flex-1 text-[15px] font-semibold text-[var(--nurea-text)]">
        WhatsApp
      </span>
      <ArrowRight
        size={15}
        className="shrink-0 text-[var(--nurea-text-subtle)] transition-transform duration-300 group-hover:-rotate-45"
      />
    </a>
  );
}

/* ─── Main sheet ──────────────────────────────────────────── */

interface PerfumeSheetProps {
  perfume: Perfume;
  onClose: () => void;
}

function SheetContent({ perfume, onClose }: PerfumeSheetProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const imageSrc = getPerfumeImage(perfume, isDark ? "dark" : "light");
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const blurUrl = perfume.blurDataURL ?? NUREA_IMAGE_BLUR_DATA_URL;
  const isGammeComplete = perfume.category === "Gammes Complètes";

  const [visible, setVisible] = useState(false);
  const touchStartY = useRef<number | null>(null);

  /* Entrée animée */
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* Fermeture avec sortie animée */
  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 400);
  }, [onClose]);

  /* Escape key */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [close]);

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Swipe-to-close */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStartY.current = t.clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const t = e.changedTouches[0];
    if (t && t.clientY - touchStartY.current > 70) close();
    touchStartY.current = null;
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end md:hidden">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-400 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${perfume.brand} — ${perfume.name}`}
        className={`relative flex flex-col overflow-hidden rounded-t-[28px] bg-[var(--nurea-bg)] shadow-2xl transition-transform duration-500 ease-out-expo
          ${visible ? "translate-y-0" : "translate-y-full"}
        `}
        style={{
          maxHeight:
            "calc(var(--nurea-vh, 100dvh) - env(safe-area-inset-top, 0px) - 7%)",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Image — démarre immédiatement, drag handle en overlay */}
        <div
          className="relative shrink-0 w-full overflow-hidden"
          style={{
            height:
              "min(52dvh, calc(var(--nurea-vh, 100dvh) - env(safe-area-inset-top, 0px) - 320px))",
          }}
        >
          <Image
            key={imageSrc}
            src={imageSrc}
            alt={`${perfume.brand} — ${perfume.name}`}
            fill
            sizes="100vw"
            className="object-cover animate-fade-in-up"
            placeholder="blur"
            blurDataURL={blurUrl}
            priority
          />

          {/* Drag handle — overlay sur l'image, pas de bande de fond visible */}
          <div className="absolute inset-x-0 top-3 z-20 flex justify-center select-none pointer-events-none" aria-hidden="true">
            <div className="h-1 w-12 rounded-full bg-white/40 shadow-sm" />
          </div>

          {/* Tags */}
          {perfume.tags && (
            <div className="absolute left-0 top-3 z-10 flex flex-col gap-1">
              {perfume.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-[var(--nurea-accent-solid)] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-white"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions overlay : theme toggle + close */}
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white active:scale-90 transition-all duration-300 touch-manipulation"
            >
              {isDark ? (
                <Sun size={15} strokeWidth={2} />
              ) : (
                <Moon size={15} strokeWidth={2} />
              )}
            </button>
            <button
              onClick={close}
              aria-label="Fermer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white active:scale-90 transition-transform touch-manipulation"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Bottom gradient + name */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--nurea-bg)] via-[var(--nurea-bg)]/60 to-transparent px-5 pb-4 pt-16">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--nurea-accent)]">
              {perfume.brand}
            </p>
            <h2 className="font-serif text-[24px] leading-tight text-[var(--nurea-text)]">
              {perfume.name}
            </h2>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {isGammeComplete && perfume.classics ? (
            <GammeClassicsList perfume={perfume} />
          ) : (
            <RegularCTAs perfume={perfume} />
          )}
        </div>
      </div>
    </div>
  );
}

function RegularCTAs({ perfume }: { perfume: Perfume }) {
  return (
    <div className="flex flex-col gap-3">
      <SnapBtn href={snapUrl()} />
      <WaBtn href={whatsappUrl(perfume.name, perfume.brand)} />
      <Link
        href={contactHref(perfume.name, perfume.brand)}
        className="flex items-center justify-center gap-2 py-3 text-[11px] uppercase tracking-[0.2em] text-[var(--nurea-text-subtle)] transition-colors active:text-[var(--nurea-text)] touch-manipulation"
      >
        <FileText size={12} />
        Formulaire de contact
      </Link>
    </div>
  );
}

function GammeClassicsList({ perfume }: { perfume: Perfume }) {
  const classics = perfume.classics ?? [];
  return (
    <div>
      <p className="mb-3 text-[9px] uppercase tracking-[0.25em] text-[var(--nurea-accent)]">
        Sélectionner un parfum
      </p>
      <div className="flex flex-col gap-1.5">
        {classics.map((classic) => (
          <div
            key={classic}
            className="flex min-h-[52px] items-center gap-3 border border-[var(--nurea-border)] bg-[var(--nurea-surface)]/60 px-3"
          >
            <span className="flex-1 truncate text-[13px] text-[var(--nurea-text)]">
              {classic}
            </span>
            {/* Snap chip */}
            <a
              href={snapUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 active:scale-95 transition-transform touch-manipulation"
              style={{ backgroundColor: "#FFFC00" }}
              aria-label={`Commander ${classic} sur Snapchat`}
            >
              <SnapchatIcon className="h-3.5 w-3.5 text-black" />
              <span className="text-[9px] font-black uppercase tracking-wide text-black">
                Snap
              </span>
            </a>
            {/* WA chip */}
            <a
              href={whatsappUrl(classic, perfume.brand)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 active:scale-95 transition-transform touch-manipulation"
              style={{ borderColor: "#25D366", backgroundColor: "rgba(37,211,102,0.1)" }}
              aria-label={`Commander ${classic} sur WhatsApp`}
            >
              <WhatsAppIcon className="h-3.5 w-3.5" style={{ color: "#25D366" }} />
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#25D366" }}>
                WA
              </span>
            </a>
          </div>
        ))}
      </div>
      <Link
        href={contactHref(perfume.name, perfume.brand)}
        className="mt-4 flex items-center justify-center gap-2 py-3 text-[11px] uppercase tracking-[0.2em] text-[var(--nurea-text-subtle)] touch-manipulation"
      >
        <FileText size={12} />
        Formulaire de contact
      </Link>
    </div>
  );
}

/* ─── Portal wrapper ──────────────────────────────────────── */

export function PerfumeSheet({ perfume, onClose }: PerfumeSheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <SheetContent perfume={perfume} onClose={onClose} />,
    document.body
  );
}

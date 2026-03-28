"use client";

import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function LegalComingSoon() {
  return (
    <div className="grain flex min-h-screen flex-col bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <Navbar scrolled={true} />
      
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <ScrollReveal direction="scale">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--nurea-border)] bg-[var(--nurea-surface)] text-[var(--nurea-accent)] shadow-2xl shadow-[var(--nurea-accent-subtle)]">
            <Clock size={32} strokeWidth={1.5} />
          </div>
          
          <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-accent)]">
            Nuréa Parfums
          </span>
          <h1 className="mb-6 font-serif text-[clamp(28px,5vw,42px)] leading-tight text-[var(--nurea-text)]">
            Parachever l&apos;Expérience
          </h1>
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-[var(--nurea-text-muted)]">
            Nous rédigeons actuellement les derniers détails de nos engagements légaux pour vous assurer une sérénité absolue. Cette section sera dévoilée très prochainement.
          </p>
          
          <div className="mt-12">
            <Link
              href="/"
              className="btn-nurea group gap-3 border-[var(--nurea-border)] hover:border-[var(--nurea-accent)]"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </ScrollReveal>
      </main>

      <Footer />
    </div>
  );
}

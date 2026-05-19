"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NureaFormPageTopProps {
  title: string;
  /** Sous le titre (ex. compteur, aide courte) */
  subtitle?: string;
  /** Ligne fine au-dessus du titre (ex. Création · Parfum #12) */
  eyebrow?: string;
  onBack: () => void;
  /** Badge statut, actions secondaires */
  end?: ReactNode;
  className?: string;
}

/**
 * Titre de page formulaire cohérent avec l’onglet Catalogue (sans second bandeau sticky
 * : le shell fournit déjà le header « Nuréa »).
 */
export function NureaFormPageTop({
  title,
  subtitle,
  eyebrow,
  onBack,
  end,
  className,
}: NureaFormPageTopProps) {
  return (
    <div className={cn("px-5 pt-4 pb-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <button
            type="button"
            onClick={onBack}
            className="ios-transition tap-scale inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-0 text-neutral-600 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 focus-visible:ring-offset-2 focus-visible:ring-offset-ios-bg"
            aria-label="Retour"
          >
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
          <div className="min-w-0 pt-0.5">
            {eyebrow ? (
              <p className="text-[11px] font-medium uppercase tracking-widest text-admin-subtle">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-admin-text sm:text-3xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm leading-snug text-admin-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {end ? <div className="shrink-0 pt-1">{end}</div> : null}
      </div>
    </div>
  );
}

/** Libellé de section aligné sur les blocs « Mise en avant » / listes du catalogue. */
export function NureaFormSectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="px-0.5 text-xs font-bold uppercase tracking-widest text-neutral-400">{children}</h3>
  );
}

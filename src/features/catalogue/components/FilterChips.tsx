"use client";

import { cn } from "@/lib/utils";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  count: number;
};

type FilterChipsProps<T extends string> = {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
};

/**
 * Rangée de filtres compacte, défilable horizontalement.
 *
 * Remplace le second bloc segmenté pleine largeur du catalogue : deux
 * contrôles segmentés empilés au-dessus de la liste consommaient un tiers de
 * l'écran avant la première ligne de contenu, et se ressemblaient assez pour
 * qu'on confonde « onglet » et « filtre ».
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: FilterChipsProps<T>) {
  /*
   * Un filtre qui ne ramènerait rien n'est pas une option, c'est du bruit :
   * « Masqués 0 » occupe une place sur un écran de téléphone sans jamais
   * servir. Le filtre actif reste affiché même vide, sinon il disparaîtrait
   * sous les doigts de qui vient de le choisir.
   */
  const shown = options.filter((o) => o.count > 0 || o.value === value);

  /*
   * La rangée disparaît quand elle ne discrimine rien — un seul filtre, ou
   * plusieurs qui désignent le même ensemble (« Tous 99 » et « Visibles 99 »
   * quand aucun parfum n'est masqué). Elle rend alors ses 42 px à la liste, et
   * revient d'elle-même dès qu'un filtre redevient utile.
   */
  const allSameCount = shown.every((o) => o.count === shown[0]!.count);
  if (shown.length <= 1 || allSameCount) return null;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      /* 34 px assumé : filtre secondaire, au même gabarit que les chips de
         Mail iOS. Les cibles principales de l'écran restent à 44 px. */
      data-touch-exempt
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-0.5",
        "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
    >
      {shown.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3",
              "text-[13px] font-semibold tap-scale",
              "transition-colors duration-[var(--admin-duration-fast)] ease-[var(--admin-easing-default)]",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
              active
                ? "bg-[var(--admin-accent)] text-white"
                : "bg-[var(--admin-surface)] text-[var(--admin-text-muted)]",
            )}
            style={active ? undefined : { border: "1px solid var(--admin-border-strong)" }}
          >
            {opt.label}
            <span
              className={cn(
                "tnum text-[12px] font-medium",
                active ? "text-white/70" : "text-[var(--admin-text-subtle)]",
              )}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

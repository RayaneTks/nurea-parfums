import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Money, type MoneyTone } from "./Money";
import type { MoneyValue } from "./money-value";

type KpiTileBase = {
  /** Libellé canonique (02 §6) : « Encaissé · septembre », « À encaisser ». */
  label: string;
  /** Montant dominant de l'écran : rôle `display` (un par écran au plus). */
  dominant?: boolean;
  /** Ligne sous le chiffre : « Marge nette · septembre 1 240 € · 38 % ». */
  hint?: ReactNode;
  /**
   * Écran d'action du chiffre (À encaisser → `/admin/encaisser`). SANS `href`,
   * la tuile est en lecture seule : l'action du chiffre est déjà un bouton
   * visible du même écran (fiche client : tuile « À encaisser » + CTA
   * « Encaisser ») — jamais deux chemins vers la même destination (05 §5.3).
   * Sur l'écran de RÉFÉRENCE d'un chiffre, pas de tuile du tout : `Money` + libellé.
   */
  href?: string;
  className?: string;
};

type KpiTileProps =
  | (KpiTileBase & {
      /** Montant, affiché sans centimes. */
      amount: MoneyValue;
      /** `warning` pour « À encaisser ». */
      tone?: MoneyTone;
      value?: never;
    })
  | (KpiTileBase & {
      /** Valeur non monétaire : compteur, date du dernier achat. */
      value: ReactNode;
      amount?: never;
      tone?: never;
    });

/** Tuile de chiffre (05 §3.2). */
export function KpiTile(props: KpiTileProps) {
  const { label, dominant = false, hint, href, className } = props;

  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="admin-type-micro truncate uppercase text-[var(--admin-text-subtle)]">{label}</span>
        {href ? <ChevronRight size={14} aria-hidden className="shrink-0 text-[var(--admin-text-subtle)]" /> : null}
      </span>
      <span className={cn("mt-1 block truncate", dominant ? "admin-type-display" : "admin-type-h2")}>
        {props.amount !== undefined ? (
          <Money value={props.amount} compact tone={props.tone ?? "default"} />
        ) : (
          <span className="tnum text-[var(--admin-text)]">{props.value}</span>
        )}
      </span>
      {hint ? (
        <span className="admin-type-caption mt-1 block truncate text-[var(--admin-text-muted)]">{hint}</span>
      ) : null}
    </>
  );

  const surface = cn(
    "flex min-w-0 flex-col rounded-[var(--admin-radius-lg)] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4",
    "shadow-[shadow:var(--admin-shadow-sm)]",
    className,
  );

  // `data-kpi-tile` : repère de test, comme `data-money-tile` sur les tuiles de la fiche document.
  // Sans lui, une assertion portée sur la grille entière passe sur la MAUVAISE tuile — et masque
  // exactement ce qu'elle prétend vérifier (relevé à J13 : « Coûts d'achat » lu pour « Marge nette »).
  if (!href)
    return (
      <div className={surface} data-kpi-tile={label}>
        {body}
      </div>
    );

  return (
    <Link
      data-kpi-tile={label}
      href={href}
      prefetch
      className={cn(
        surface,
        "tap-scale min-h-[var(--admin-touch-min)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "active:bg-[var(--admin-surface-alt)] mouse-hover:shadow-[shadow:var(--admin-shadow-md)]",
      )}
    >
      {body}
    </Link>
  );
}

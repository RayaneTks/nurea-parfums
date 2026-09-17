import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ListRowBase = {
  /** Slot gauche : Avatar, vignette, icône, Checkbox. */
  leading?: ReactNode;
  /** Texte principal : une chaîne (body 500, ellipse) ou un nœud composé. */
  primary: ReactNode;
  /** Légende sous le principal (caption, ellipse). */
  secondary?: ReactNode;
  /**
   * Slot droit : UN montant `.tnum` OU UN badge, pas les deux (05 §5.4). Peut
   * porter un contrôle (bouton œil, bouton-montant) : il reste tapable
   * indépendamment de la rangée.
   */
  trailing?: ReactNode;
  /** Chevron de navigation. */
  chevron?: boolean;
  disabled?: boolean;
  /** Nom accessible de la zone pressable, quand le texte seul ne suffit pas. */
  ariaLabel?: string;
  className?: string;
};

type ListRowProps =
  | (ListRowBase & { href: string; onClick?: never })
  | (ListRowBase & { onClick: () => void; href?: never })
  | (ListRowBase & { href?: never; onClick?: never });

/*
 * Anatomie : la zone pressable (lien ou bouton) ne contient que le texte, et
 * s'étend à toute la rangée par un pseudo-élément. `leading` et `trailing`
 * restent HORS du lien : un bouton dans un lien est du HTML invalide, et le
 * bouton-montant d'une créance ou l'œil d'un parfum doivent rester tapables
 * sans ouvrir la fiche. Ces deux slots laissent passer le doigt vers la rangée,
 * sauf sur leurs propres contrôles.
 */
const slotClass =
  "relative shrink-0 pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto";

/** Ligne de liste standard : 56 px minimum, deux lignes de texte au plus. */
export function ListRow(props: ListRowProps) {
  const { leading, primary, secondary, trailing, chevron, disabled, ariaLabel, className } = props;
  const href = "href" in props ? props.href : undefined;
  const onClick = "onClick" in props ? props.onClick : undefined;
  const interactive = (href !== undefined || onClick !== undefined) && !disabled;

  const text = (
    <>
      {typeof primary === "string" ? (
        <span className="admin-type-body block truncate font-medium text-[var(--admin-text)]">{primary}</span>
      ) : (
        primary
      )}
      {secondary ? (
        <span className="admin-type-caption mt-0.5 block truncate text-[var(--admin-text-muted)]">{secondary}</span>
      ) : null}
    </>
  );

  const pressClass = cn(
    "admin-row-press flex min-w-0 flex-1 flex-col text-left",
    "after:absolute after:inset-0 after:content-['']",
    "focus-visible:outline-none",
  );

  return (
    <div
      className={cn(
        "relative flex min-h-[56px] items-center gap-3 rounded-[var(--admin-radius-md)] px-3 py-2",
        interactive
          ? cn(
              "[transition-property:transform,background-color] [transition-duration:var(--admin-duration-fast)] [transition-timing-function:var(--admin-easing-default)]",
              "has-[.admin-row-press:active]:bg-[var(--admin-surface-muted)]",
              "motion-safe:has-[.admin-row-press:active]:scale-[var(--admin-press-scale)]",
              "has-[.admin-row-press:focus-visible]:ring-4 has-[.admin-row-press:focus-visible]:ring-[var(--admin-accent-ring)]",
              "mouse-hover:bg-[var(--admin-surface-alt)]",
            )
          : null,
        disabled ? "opacity-50" : null,
        className,
      )}
    >
      {leading ? <span className={slotClass}>{leading}</span> : null}

      {interactive && href !== undefined ? (
        <Link href={href} prefetch aria-label={ariaLabel} className={pressClass}>
          {text}
        </Link>
      ) : interactive && onClick !== undefined ? (
        <button type="button" onClick={onClick} aria-label={ariaLabel} className={pressClass}>
          {text}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col">{text}</span>
      )}

      {trailing ? <span className={slotClass}>{trailing}</span> : null}
      {chevron ? (
        <ChevronRight size={16} className="shrink-0 text-[var(--admin-text-subtle)]" aria-hidden />
      ) : null}
    </div>
  );
}

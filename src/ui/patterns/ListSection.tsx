import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Children, Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "../primitives/Card";
import { Divider } from "../primitives/Divider";
import { ListSectionDisclosure } from "./ListSectionDisclosure";
import { Money, type MoneyTone } from "./Money";
import type { MoneyValue } from "./money-value";

type ListSectionBase = {
  /** Information COMMUNE du groupe : statut, urgence, lot, initiale, client. */
  title: ReactNode;
  /** Compteur du groupe (« En retard · 3 »). */
  count?: number;
  /** Montant du groupe, à droite (total d'un client à encaisser). */
  amount?: MoneyValue;
  amountTone?: MoneyTone;
  /** Seconde ligne d'en-tête : « depuis 42 j ». */
  description?: ReactNode;
  /** Actions du groupe, sur la seconde ligne : boutons `text` (« Relancer »). */
  action?: ReactNode;
  /** Teinte du titre : « En retard » en `warning`. */
  tone?: "default" | "warning" | "danger";
  /** `ListRow[]` : séparées d'un filet, bords partagés. */
  children: ReactNode;
  /** Sous la carte : « Afficher plus ». */
  footer?: ReactNode;
  className?: string;
};

type ListSectionProps =
  | (ListSectionBase & {
      /** En-tête cliquable « Commande de mars · 12 › » vers l'écran du groupe. */
      href?: string;
      collapsible?: false;
      defaultOpen?: never;
    })
  | (ListSectionBase & { collapsible: true; defaultOpen?: boolean; href?: never });

const titleTone = {
  default: "text-[var(--admin-text)]",
  warning: "text-[var(--admin-warning)]",
  danger: "text-[var(--admin-danger)]",
} as const;

/**
 * Liste sectionnée (05 §3.2) : un en-tête qui porte ce que le groupe a en
 * commun, une carte bord à bord de `ListRow`. Une ligne ne répète JAMAIS
 * l'information de son en-tête — c'est tout l'intérêt du groupe.
 */
export function ListSection(props: ListSectionProps) {
  const { title, count, amount, amountTone = "default", description, action, tone = "default", children, footer, className } = props;

  const rows = Children.toArray(children);
  const card = (
    <Card padding={0}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <Divider /> : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );

  const label = (
    <>
      <span className="truncate">{title}</span>
      {count !== undefined ? (
        <span className="admin-type-caption tnum shrink-0 text-[var(--admin-text-muted)]">· {count}</span>
      ) : null}
    </>
  );
  const aside = amount !== undefined ? <Money value={amount} tone={amountTone} bold className="admin-type-body-em shrink-0" /> : null;
  const below =
    description || action ? (
      <div className="flex min-w-0 items-center justify-between gap-2">
        {description ? (
          <span className="admin-type-caption min-w-0 truncate text-[var(--admin-text-muted)]">{description}</span>
        ) : (
          <span />
        )}
        {action ? <span className="flex shrink-0 items-center gap-1">{action}</span> : null}
      </div>
    ) : null;
  const titleClass = cn("admin-type-body-em", titleTone[tone]);

  if (props.collapsible) {
    return (
      <section className={cn("flex flex-col gap-1", className)}>
        <ListSectionDisclosure label={label} aside={aside} below={below} defaultOpen={props.defaultOpen ?? false} titleClass={titleClass}>
          {card}
        </ListSectionDisclosure>
        {footer}
      </section>
    );
  }

  return (
    <section className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-col px-1 pb-1">
        <div className="flex min-h-[28px] items-center gap-2">
          <h2 className={cn("flex min-w-0 flex-1 items-baseline", titleClass)}>
            {props.href ? (
              <Link
                href={props.href}
                className={cn(
                  "tap-scale admin-hit-target min-w-0 max-w-full gap-1.5 rounded-[var(--admin-radius-md)]",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
                )}
              >
                {label}
                <ChevronRight size={16} aria-hidden className="shrink-0 text-[var(--admin-text-subtle)]" />
              </Link>
            ) : (
              <span className="flex min-w-0 items-baseline gap-1.5">{label}</span>
            )}
          </h2>
          {aside}
        </div>
        {below}
      </div>
      {card}
      {footer}
    </section>
  );
}

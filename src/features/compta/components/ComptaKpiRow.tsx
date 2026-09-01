import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import type { ComptaListResult } from "@/server/sales/queries";
import { formateEuros, formatePourcent } from "@/ui/patterns/format";

type ComptaKpiRowProps = {
  summary: ComptaListResult["summary"];
  salesCashed?: string;
  ordersCashed?: string;
  /** Reste dû sur les ventes (clients qui doivent encore payer). */
  salesDue?: string;
  /** Reste dû sur les commandes confirmées (acomptes partiels). */
  ordersDue?: string;
};

/**
 * Ces montants apparaissent en légende, à côté de tuiles mises en forme par
 * `Money`. Un formateur local produisait « 1025 € » quand la tuile voisine
 * affichait « 1 480 € » : deux formes pour la même nature de chiffre, sur la
 * même carte.
 */
const eur = (value: string | number | undefined) => formateEuros(value, { compact: true });

/**
 * Chiffres de la vue Ventes.
 *
 * Deux tuiles seulement en haut — « Encaissé » et « Marge nette » — au même
 * vocabulaire que le tableau de bord. La grille à trois colonnes précédente
 * repliait ses libellés sur deux lignes dès 375 px, et son « Panier moyen »
 * n'était consulté par personne : le nombre de ventes suffit, en légende.
 *
 * Ce qui reste dû et ce qui a été dépensé sont des lignes, pas des tuiles :
 * ce sont des montants à surveiller, pas des indicateurs de performance.
 */
export function ComptaKpiRow({
  summary,
  salesCashed,
  ordersCashed,
  salesDue,
  ordersDue,
}: ComptaKpiRowProps) {
  const debt = Number(summary.outstandingRevenue ?? "0");
  const hasDebt = Number.isFinite(debt) && debt > 0;
  const expenses = Number(summary.totalExpenses ?? "0");
  const hasExpenses = Number.isFinite(expenses) && expenses > 0;
  const hasBreakdown = salesCashed !== undefined && ordersCashed !== undefined;

  return (
    <div className="min-w-0 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Card padding={3}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Encaissé
          </p>
          <p className="mt-1 text-[20px] font-bold leading-none">
            <Money value={summary.cashedRevenue} compact />
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            {hasBreakdown
              ? `${eur(salesCashed)} ventes · ${eur(ordersCashed)} commandes`
              : `${summary.salesCount} vente${summary.salesCount > 1 ? "s" : ""}`}
          </p>
        </Card>
        <Card padding={3}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Marge nette
          </p>
          <p className="mt-1 text-[20px] font-bold leading-none">
            <Money value={summary.netMargin} compact tone="auto" />
          </p>
          <p className="mt-1 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            {formatePourcent(Number(summary.marginPct), 1)}{hasExpenses ? " · net dépenses" : ""}
          </p>
        </Card>
      </div>

      {/* Un montant dû appelle une action. Il était affiché en bandeau inerte :
          pour encaisser, il fallait deviner qu'il faut ouvrir la fiche et
          corriger un nombre à la main. */}
      {hasDebt ? (
        <Link
          href="/admin/encaisser"
          prefetch
          className="block rounded-[14px] p-3 tap-scale focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
          style={{
            background: "var(--admin-warning-bg)",
            border: "1px solid var(--admin-warning-border)",
          }}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[var(--admin-text)]">
              Reste à encaisser
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="tnum whitespace-nowrap text-[17px] font-bold"
                style={{ color: "var(--admin-warning)" }}
              >
                {eur(debt)}
              </span>
              <ChevronRight size={16} style={{ color: "var(--admin-warning)" }} aria-hidden />
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] font-medium text-[var(--admin-warning)]">
            Encaisser
            {salesDue !== undefined && ordersDue !== undefined ? (
              <span className="font-normal text-[var(--admin-text-subtle)]">
                {" · "}
                {eur(salesDue)} ventes · {eur(ordersDue)} commandes
              </span>
            ) : null}
          </span>
        </Link>
      ) : null}

      {hasExpenses ? (
        <Card padding={3} tone="alt">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-[var(--admin-text)]">
              Dépenses déduites
            </p>
            <span
              className="tnum whitespace-nowrap text-[16px] font-bold"
              style={{ color: "var(--admin-danger)" }}
            >
              −{eur(expenses)}
            </span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

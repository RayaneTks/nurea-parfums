import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Decimal from "decimal.js-light";
import { Money } from "@/ui/patterns/Money";
import { monthSummary, revenueSummary } from "@/server/kpi/queries";
import { treasurySummary } from "@/server/treasury/queries";
import { cn } from "@/lib/utils";
import { formatePourcent } from "@/ui/patterns/format";

/**
 * Bloc argent du tableau de bord.
 *
 * Un seul chiffre dominant — l'encaissé — puis trois chiffres secondaires qui
 * répondent chacun à une question distincte. L'ancienne grille alignait six
 * tuiles de même poids visuel dont plusieurs mesuraient la même somme sous des
 * noms différents (« reste à encaisser » et « prévision trésorerie »,
 * « marge nette » et « bénéfice net du mois ») : impossible de savoir où
 * regarder, et deux chiffres semblaient se contredire.
 *
 * Vocabulaire fixé, employé partout dans l'app :
 *   Encaissé     — argent réellement reçu.
 *   À encaisser  — reste dû par les clients.
 *   Marge nette  — encaissé − coûts d'achat − dépenses.
 *   Trésorerie   — solde cumulé des poches.
 */
export async function MoneyBlock() {
  const [global, treasury, month] = await Promise.all([
    revenueSummary(),
    treasurySummary(),
    monthSummary(),
  ]);

  const marginPct = Number(global.marginPct);
  const hasMargin = Number.isFinite(marginPct);

  return (
    <section aria-label="Argent" className="flex flex-col gap-2">
      <Link
        href="/admin/compta"
        prefetch
        className={cn(
          "block rounded-[16px] p-4 tap-scale",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        )}
        style={{
          background: "var(--admin-accent)",
          boxShadow: "var(--admin-shadow-md)",
        }}
      >
        <span className="flex items-center justify-between text-white/70">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]">
            Encaissé
          </span>
          <ChevronRight size={16} aria-hidden />
        </span>
        <span className="mt-1 block text-[34px] font-bold leading-none tracking-[-0.02em] text-white tnum">
          <Money value={global.cashedRevenue} compact tone="inherit" />
        </span>
        <span className="mt-2 block text-[13px] text-white/75">
          <Money value={global.netMargin} compact tone="inherit" className="font-semibold text-white" />{" "}
          de marge nette
          {hasMargin ? ` · ${formatePourcent(marginPct, 1)}` : null}
        </span>
      </Link>

      <div className="grid grid-cols-3 gap-2">
        <SecondaryTile
          label="À encaisser"
          value={global.outstandingRevenue}
          hint="dû par clients"
          // Mène à l'écran d'encaissement, pas à la liste des commandes : un
          // montant dû appelle une action, pas une navigation de plus.
          href="/admin/encaisser"
          tone={new Decimal(global.outstandingRevenue).greaterThan(0) ? "warning" : "default"}
        />
        <SecondaryTile
          label="Trésorerie"
          value={treasury.total}
          hint="toutes poches"
          href="/admin/compta?vue=tresorerie"
        />
        <SecondaryTile
          label="Ce mois"
          value={month.cashed}
          hint={`${month.count} vente${month.count > 1 ? "s" : ""}`}
          href="/admin/compta"
        />
      </div>
    </section>
  );
}

function SecondaryTile({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  tone?: "default" | "warning";
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex min-h-[var(--admin-touch-min)] flex-col justify-between rounded-[14px] p-2.5 tap-scale",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
      )}
      style={{
        background: "var(--admin-surface)",
        border: "1px solid var(--admin-border)",
        boxShadow: "var(--admin-shadow-sm)",
      }}
    >
      <span className="block text-[10px] font-semibold uppercase leading-tight tracking-[0.04em] text-[var(--admin-text-subtle)]">
        {label}
      </span>
      <span className="mt-1.5 block text-[17px] font-bold leading-none">
        <Money value={value} compact tone={tone === "warning" ? "danger" : "default"} />
      </span>
      <span className="mt-1 block truncate text-[10px] text-[var(--admin-text-subtle)]">
        {hint}
      </span>
    </Link>
  );
}

/** Squelette aux dimensions exactes du bloc rendu (zéro décalage au chargement). */
export function MoneyBlockFallback() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="admin-skeleton h-[124px] rounded-[16px]" />
      <div className="grid grid-cols-3 gap-2">
        <div className="admin-skeleton h-[76px] rounded-[14px]" />
        <div className="admin-skeleton h-[76px] rounded-[14px]" />
        <div className="admin-skeleton h-[76px] rounded-[14px]" />
      </div>
    </div>
  );
}

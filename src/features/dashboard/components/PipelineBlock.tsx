import Link from "next/link";
import { pipelineCounts } from "@/server/kpi/queries";
import { cn } from "@/lib/utils";

type Cell = {
  href: string;
  label: string;
  count: number;
  fg: string;
  bg: string;
};

/**
 * Pipeline des commandes — uniquement des compteurs d'actions à mener.
 *
 * Aucun montant ici : les euros vivent dans `MoneyBlock`. L'ancienne version
 * affichait un « encaissable » qui reprenait l'à-encaisser déjà présent plus
 * haut sur le même écran, sous un troisième nom.
 */
export async function PipelineBlock() {
  const p = await pipelineCounts();
  if (p.pendingCount === 0 && p.readyCount === 0 && p.overdueCount === 0) return null;

  const cells: Cell[] = [
    {
      href: "/admin/ordres?filter=pending",
      label: "En attente",
      count: p.pendingCount,
      fg: "var(--admin-warning)",
      bg: "var(--admin-warning-bg)",
    },
    {
      href: "/admin/ordres?filter=ready",
      label: "À traiter",
      count: p.readyCount,
      fg: "var(--admin-success)",
      bg: "var(--admin-success-bg)",
    },
    {
      href: "/admin/ordres?filter=ready",
      label: "En retard",
      count: p.overdueCount,
      fg: p.overdueCount > 0 ? "var(--admin-danger)" : "var(--admin-text-subtle)",
      bg: p.overdueCount > 0 ? "var(--admin-danger-bg)" : "var(--admin-surface-muted)",
    },
  ];

  return (
    <section aria-label="Commandes en cours">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
        Commandes
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {cells.map((cell) => (
          <Link
            key={cell.label}
            href={cell.href}
            prefetch
            className={cn(
              "flex min-h-[var(--admin-touch-min)] flex-col items-center justify-center gap-1 rounded-[14px] py-3 tap-scale",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
            )}
            style={{ background: cell.bg }}
          >
            <span
              className="text-[22px] font-bold leading-none tnum"
              style={{ color: cell.fg }}
            >
              {cell.count}
            </span>
            <span
              className="text-[11px] font-semibold leading-none"
              style={{ color: cell.fg }}
            >
              {cell.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

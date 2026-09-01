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

  /*
   * Les couleurs suivent celles des pastilles de statut : le bordeaux marque
   * l'endroit où il y a du travail, le vert reste réservé à ce qui est fait.
   * « À traiter » portait le vert, c'est-à-dire la couleur qui dit « c'est
   * réglé » partout ailleurs dans l'app.
   *
   * « En retard » ne s'affiche que s'il y en a. Une tuile rouge à zéro occupait
   * un tiers de la rangée pour annoncer qu'il n'y a rien à faire — et la
   * couleur d'alerte s'y usait à vide.
   */
  const cells: Cell[] = [
    {
      href: "/admin/ordres?filter=pending",
      label: "En attente",
      count: p.pendingCount,
      fg: "var(--admin-text-muted)",
      bg: "var(--admin-surface-muted)",
    },
    {
      href: "/admin/ordres?filter=ready",
      label: "À traiter",
      count: p.readyCount,
      fg: "var(--admin-accent)",
      bg: "var(--admin-accent-bg)",
    },
    // Les commandes en retard sont un sous-ensemble de « à traiter », et la
    // liste n'a pas de filtre pour elles : le lien y mène donc, faute de mieux,
    // mais au moins il ne promet pas une vue qui n'existe pas.
    ...(p.overdueCount > 0
      ? [
          {
            href: "/admin/ordres?filter=ready",
            label: "dont en retard",
            count: p.overdueCount,
            fg: "var(--admin-danger)",
            bg: "var(--admin-danger-bg)",
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Commandes en cours">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
        Commandes
      </h2>
      <div className={cn("grid gap-2", cells.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
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

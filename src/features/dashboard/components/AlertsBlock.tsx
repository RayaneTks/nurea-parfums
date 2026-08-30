import Link from "next/link";
import { ChevronRight, Clock, PackageX, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { LOW_STOCK_THRESHOLD } from "@/domain/stock";
import { treasurySummary } from "@/server/treasury/queries";
import { pipelineCounts } from "@/server/kpi/queries";
import { cn } from "@/lib/utils";

type Tone = "danger" | "warning";

type Alert = {
  id: string;
  tone: Tone;
  icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
};

const toneStyles: Record<Tone, { bg: string; border: string; fg: string }> = {
  danger: {
    bg: "var(--admin-danger-bg)",
    border: "var(--admin-danger-border)",
    fg: "var(--admin-danger)",
  },
  warning: {
    bg: "var(--admin-warning-bg)",
    border: "var(--admin-warning-border)",
    fg: "var(--admin-warning)",
  },
};

/**
 * Bandeau d'alertes — uniquement ce qui demande une action aujourd'hui.
 *
 * Regroupé en un seul composant (et une seule vague de requêtes) : trois
 * bannières indépendantes empilées repoussaient les chiffres sous la ligne de
 * flottaison et se ressemblaient toutes. Rien à faire → rien n'est rendu.
 */
export async function AlertsBlock() {
  const [treasury, pipeline, trackedTotal, outOfStock, lowStock] = await Promise.all([
    treasurySummary(),
    pipelineCounts(),
    prisma.perfume.count({ where: { isPrivate: false } }),
    prisma.perfume.count({ where: { isPrivate: false, stock: { lte: 0 } } }),
    prisma.perfume.count({
      where: { isPrivate: false, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
    }),
  ]);

  const alerts: Alert[] = [];

  if (pipeline.overdueCount > 0) {
    alerts.push({
      id: "overdue",
      tone: "danger",
      icon: Clock,
      title: `${pipeline.overdueCount} commande${pipeline.overdueCount > 1 ? "s" : ""} en retard`,
      detail: "Date de livraison dépassée",
      href: "/admin/ordres?filter=ready",
    });
  }

  const unattributed = Number(treasury.unattributed);
  if (Number.isFinite(unattributed) && unattributed > 0.005) {
    alerts.push({
      id: "unattributed",
      tone: "danger",
      icon: Wallet,
      title: `${unattributed.toFixed(2)} € non attribués`,
      detail: "À répartir entre tes poches",
      href: "/admin/compta?vue=tresorerie",
    });
  }

  // Si AUCUNE référence n'a de stock, c'est que le stock n'est pas tenu (achat à
  // la commande) : alerter sur 100 % du catalogue serait un bandeau permanent
  // et sans action possible.
  const stockIsTracked = trackedTotal > 0 && outOfStock < trackedTotal;
  if (stockIsTracked && outOfStock + lowStock > 0) {
    const parts: string[] = [];
    if (outOfStock > 0) parts.push(`${outOfStock} en rupture`);
    if (lowStock > 0) parts.push(`${lowStock} bientôt épuisé${lowStock > 1 ? "s" : ""}`);
    alerts.push({
      id: "stock",
      tone: "warning",
      icon: PackageX,
      title: "Stock à réapprovisionner",
      detail: parts.join(" · "),
      href: "/admin/catalogue?stock=low",
    });
  }

  if (alerts.length === 0) return null;

  return (
    <section aria-label="Alertes" className="flex flex-col gap-2">
      {alerts.map((alert) => {
        const t = toneStyles[alert.tone];
        const Icon = alert.icon;
        return (
          <Link
            key={alert.id}
            href={alert.href}
            prefetch
            className={cn(
              "flex min-h-[var(--admin-touch-min)] items-center gap-3 rounded-[14px] px-3 py-2.5 tap-scale",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
            )}
            style={{ background: t.bg, border: `1px solid ${t.border}` }}
          >
            <Icon size={17} strokeWidth={2.2} style={{ color: t.fg }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-[14px] font-semibold leading-tight"
                style={{ color: t.fg }}
              >
                {alert.title}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-[var(--admin-text-muted)]">
                {alert.detail}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: t.fg }} aria-hidden />
          </Link>
        );
      })}
    </section>
  );
}

/** Squelette du bandeau : réserve une ligne pour éviter le saut de mise en page. */
export function AlertsFallback() {
  return (
    <div
      aria-hidden
      className="admin-skeleton h-[60px] rounded-[14px]"
      style={{ opacity: 0.6 }}
    />
  );
}

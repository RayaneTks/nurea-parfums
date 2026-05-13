import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, ClipboardList, PlusCircle, Sparkles, TrendingUp } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { StatCard } from "../ui/StatCard";
import {
  pipelineCounts,
  revenueSummary,
  startOfMonth,
  todayStart,
  topPerfumes,
} from "@/server/kpi/queries";

export async function DashboardLanding() {
  return (
    <main id="main-content" className="flex-1 space-y-5 px-5 pb-4 pt-2">
      <header>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          Tableau de bord
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Aperçu rapide — ⌘K pour tout le reste.
        </p>
      </header>

      <Suspense fallback={<KpiSkeleton />}>
        <KpiBlock />
      </Suspense>

      <Suspense fallback={<SectionCard><p className="py-2 text-sm text-neutral-400">…</p></SectionCard>}>
        <PipelineBlock />
      </Suspense>

      <Suspense fallback={<SectionCard><p className="py-2 text-sm text-neutral-400">…</p></SectionCard>}>
        <TopPerfumesBlock />
      </Suspense>

      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Actions rapides</h2>
        <div className="grid grid-cols-1 gap-2">
          <Link
            href="/admin/ordres/new?mode=quick"
            prefetch
            className="group inline-flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white px-4 py-3 text-sm tap-scale active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-nurea-bordeaux/10 text-nurea-bordeaux">
                <PlusCircle size={18} />
              </span>
              <span>
                <span className="block font-medium text-neutral-900">Commande rapide</span>
                <span className="block text-xs text-neutral-500">1 écran, 30 secondes</span>
              </span>
            </span>
            <ArrowRight size={16} className="text-neutral-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/admin/ordres"
            prefetch
            className="group inline-flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white px-4 py-3 text-sm tap-scale active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                <ClipboardList size={18} />
              </span>
              <span className="font-medium text-neutral-900">Commandes du jour</span>
            </span>
            <ArrowRight size={16} className="text-neutral-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/admin/compta"
            prefetch
            className="group inline-flex items-center justify-between rounded-xl border border-neutral-200/70 bg-white px-4 py-3 text-sm tap-scale active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                <TrendingUp size={18} />
              </span>
              <span className="font-medium text-neutral-900">Compta</span>
            </span>
            <ArrowRight size={16} className="text-neutral-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </SectionCard>
    </main>
  );
}

function KpiSkeleton() {
  return (
    <SectionCard>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />
        ))}
      </div>
    </SectionCard>
  );
}

async function KpiBlock() {
  const now = new Date();
  const monthRange = { start: startOfMonth(now), end: new Date(now.getTime() + 1000) };
  const todayRange = { start: todayStart(), end: new Date(now.getTime() + 1000) };

  const [month, today] = await Promise.all([
    revenueSummary(monthRange),
    revenueSummary(todayRange),
  ]);

  return (
    <SectionCard>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="CA aujourd'hui"
          value={`${Number(today.totalRevenue).toFixed(2)} €`}
          hint={`${today.count} vente${today.count > 1 ? "s" : ""}`}
          tone="accent"
        />
        <StatCard
          label="CA ce mois"
          value={`${Number(month.totalRevenue).toFixed(2)} €`}
          hint={`${month.count} vente${month.count > 1 ? "s" : ""}`}
        />
        <StatCard
          label="Marge mois"
          value={`${Number(month.totalMargin).toFixed(2)} €`}
          hint={`${month.marginPct} %`}
          tone="success"
        />
        <StatCard
          label="Panier moyen"
          value={`${Number(month.avgValue).toFixed(2)} €`}
          hint="ce mois"
        />
      </div>
    </SectionCard>
  );
}

async function PipelineBlock() {
  const p = await pipelineCounts();
  const dueNum = Number(p.dueAmount);
  if (p.pendingCount === 0 && p.readyCount === 0 && p.overdueCount === 0) {
    return null;
  }
  return (
    <SectionCard>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Pipeline</h2>
        {p.overdueCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            <AlertTriangle size={12} /> {p.overdueCount} en retard
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Link
          href="/admin/ordres?status=PENDING"
          className="rounded-lg bg-amber-50 p-2 tap-scale active:scale-[0.98]"
        >
          <p className="text-[10px] uppercase tracking-wider text-amber-700">En attente</p>
          <p className="mt-0.5 text-base font-semibold text-amber-800">{p.pendingCount}</p>
        </Link>
        <Link
          href="/admin/ordres?status=READY"
          className="rounded-lg bg-emerald-50 p-2 tap-scale active:scale-[0.98]"
        >
          <p className="text-[10px] uppercase tracking-wider text-emerald-700">À traiter</p>
          <p className="mt-0.5 text-base font-semibold text-emerald-800">{p.readyCount}</p>
        </Link>
        <div className="rounded-lg bg-neutral-50 p-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Encaissable</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums text-neutral-900">
            {dueNum.toFixed(0)} €
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

async function TopPerfumesBlock() {
  const now = new Date();
  const range = { start: startOfMonth(now), end: new Date(now.getTime() + 1000) };
  const rows = await topPerfumes(range, 5);

  if (rows.length === 0) {
    return (
      <SectionCard>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">Top parfums (mois)</h2>
        <p className="py-2 text-sm text-neutral-500">
          <Sparkles size={12} className="mr-1 inline text-nurea-bordeaux" /> Aucune vente ce mois — enregistre des ventes pour voir ce classement.
        </p>
      </SectionCard>
    );
  }

  const maxRev = Math.max(...rows.map((r) => Number(r.revenue)), 1);

  return (
    <SectionCard>
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Top parfums (mois)</h2>
      <ul className="space-y-2">
        {rows.map((r, i) => {
          const pct = (Number(r.revenue) / maxRev) * 100;
          return (
            <li key={`${r.perfumeId ?? "null"}-${i}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-neutral-900">
                    {r.name}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">
                    {r.brand ?? "—"} · {r.quantity} unité{r.quantity > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {Number(r.revenue).toFixed(0)} €
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-nurea-bordeaux"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

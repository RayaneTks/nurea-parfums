import Link from "next/link";
import { ArrowRight, ClipboardList, PlusCircle, Sparkles, TrendingUp } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { StatCard } from "../ui/StatCard";

/**
 * Page d'accueil admin — stub minimal P2.
 *
 * Plein implémentation en P8 : KPIs serveur (top parfums, marges, cashflow),
 * alertes (commandes en retard, acomptes non encaissés, soldes dus).
 */
export function DashboardLanding() {
  return (
    <main id="main-content" className="flex-1 space-y-5 px-5 pb-4 pt-2">
      <header>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          Tableau de bord
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Aperçu rapide du jour — ouvre la palette (⌘K) pour tout le reste.
        </p>
      </header>

      <SectionCard>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="CA aujourd'hui" value="—" hint="Sera calculé en P8" />
          <StatCard label="Commandes actives" value="—" hint="Sera calculé en P8" />
          <StatCard label="À encaisser" value="—" hint="Soldes dus" />
          <StatCard label="Marge mois" value="—" hint="Sera calculé en P8" />
        </div>
      </SectionCard>

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

      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Prochaines étapes</h2>
        <ul className="space-y-2 text-sm text-neutral-700">
          <li className="inline-flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 text-nurea-bordeaux" aria-hidden />
            <span>Module Clients (P3) — ardoise, historique, top clients.</span>
          </li>
          <li className="inline-flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 text-nurea-bordeaux" aria-hidden />
            <span>Catalogue bulk ops + prix par défaut serveur (P4).</span>
          </li>
          <li className="inline-flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 text-nurea-bordeaux" aria-hidden />
            <span>Form commande splitté + quick-add 30s (P5).</span>
          </li>
          <li className="inline-flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 text-nurea-bordeaux" aria-hidden />
            <span>Acomptes multiples + balance pill (P6).</span>
          </li>
          <li className="inline-flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 text-nurea-bordeaux" aria-hidden />
            <span>KPI dashboard + top parfums/marques/clients (P8).</span>
          </li>
        </ul>
      </SectionCard>
    </main>
  );
}

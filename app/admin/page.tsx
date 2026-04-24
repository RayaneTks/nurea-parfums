import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { PackageSearch, ChevronRight, Settings2, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Administration — Accueil",
  robots: { index: false, follow: false },
};

export default function AdminHomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30">
      <AdminNav />

      <main className="mx-auto max-w-4xl px-5 pt-8 pb-32">
        <div className="mb-10">
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-100">
            Tableau de bord
          </h1>
          <p className="mt-1 text-[14px] text-zinc-400">
            Sélectionnez un module pour commencer.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Tuile Catalogue */}
          <Link
            href="/admin/catalogue"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-zinc-900/50 border border-zinc-800 p-6 transition-all duration-300 hover:bg-zinc-800/80 active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <PackageSearch className="h-6 w-6" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Catalogue</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Gérez vos parfums, les marques, et la visibilité des produits sur la boutique.
              </p>
            </div>
          </Link>

          {/* Tuile Caisse */}
          <Link
            href="/admin/caisse"
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-zinc-900/50 border border-zinc-800 p-6 transition-all duration-300 hover:bg-zinc-800/80 active:scale-[0.98]"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-500 group-hover:bg-zinc-700 group-hover:text-zinc-300 transition-colors">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-100">Caisse</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Enregistrez les ventes avec marges, consultez la comptabilité et suivez les commandes clients.
              </p>
            </div>
          </Link>

          {/* Tuile Placeholder (Prochainement) */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-900 p-6 opacity-60 grayscale transition-all duration-300 sm:col-span-2">
            <div className="flex items-start justify-between mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500">
                <Settings2 className="h-6 w-6" />
              </div>
              <div className="flex px-3 py-1 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                Bientôt
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-zinc-400">Paramètres</h2>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                Configuration avancée de la boutique, gestion des administrateurs et préférences globales.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BRAND_ASSORTMENT_LABELS,
  BRAND_POSITIONING_LABELS,
} from "@/lib/catalog/brandTaxonomy";
import { AdminNav } from "./AdminNav";

type SessionUser = { username: string; role: string };

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  assortment: string;
  positioning: string;
  _count: { perfumes: number };
};

const ASSORTMENT_KEYS = ["UNSET", "COMPLETE", "CURATED"] as const;
const POSITIONING_KEYS = ["UNSET", "NICHE", "DESIGNER", "ARTISAN"] as const;

type PerfumeRow = {
  id: number;
  name: string;
  category: string;
  status: string;
  deletedAt: string | null;
  brand: { name: string };
};

function statusPillClass(status: string): string {
  const base =
    "inline-flex items-center rounded-sm border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.06em]";
  if (status === "PUBLISHED") {
    return `${base} border-emerald-800/20 bg-emerald-600/12 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100`;
  }
  if (status === "DRAFT") {
    return `${base} border-amber-800/25 bg-amber-500/12 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100`;
  }
  if (status === "ARCHIVED") {
    return `${base} border-[var(--nurea-border-hover)] bg-black/10 text-[var(--nurea-text-subtle)] dark:bg-black/20`;
  }
  return `${base} border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)]`;
}

function statusLabel(status: string): string {
  if (status === "PUBLISHED") return "Publié";
  if (status === "DRAFT") return "Brouillon";
  if (status === "ARCHIVED") return "Archivé";
  return status;
}

export function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const [s, b, p] = await Promise.all([
        fetch("/api/admin/session", { credentials: "include" }),
        fetch("/api/admin/brands", { credentials: "include" }),
        fetch("/api/admin/perfumes?includeDeleted=1", { credentials: "include" }),
      ]);
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      if (b.ok) {
        const bj = (await b.json()) as { brands: BrandRow[] };
        setBrands(bj.brands ?? []);
      }
      if (p.ok) {
        const pj = (await p.json()) as { perfumes: PerfumeRow[] };
        setPerfumes(pj.perfumes ?? []);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredPerfumes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return perfumes;
    return perfumes.filter((row) => {
      const idStr = String(row.id);
      return (
        idStr.includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.brand.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
  }, [perfumes, search]);

  const canEdit = user?.role !== "VIEWER";

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    setBrandMsg(null);
    const name = newBrand.trim();
    if (name.length < 2) return;
    const r = await fetch("/api/admin/brands", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setBrandMsg(j.error ?? "Refusé");
      return;
    }
    setNewBrand("");
    setBrandMsg("Marque créée.");
    refresh();
  }

  async function patchBrand(id: string, patch: { assortment?: string; positioning?: string }) {
    const r = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Mise à jour impossible");
      return;
    }
    await refresh();
  }

  async function removePerfume(id: number, name: string) {
    if (!confirm(`Archiver « ${name} » ? Le parfum disparaîtra de la vitrine (suppression douce).`)) return;
    const r = await fetch(`/api/admin/perfumes/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Erreur");
      return;
    }
    refresh();
  }

  return (
    <div className="min-h-screen bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <AdminNav />
      <main className="mx-auto max-w-[1200px] px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-5 sm:px-4 md:px-10 md:pt-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="font-serif text-2xl text-[var(--nurea-text)] md:text-3xl">Catalogue</h1>
            {user ? (
              <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">
                {user.username} · {user.role === "VIEWER" ? "Lecture seule" : user.role}
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <Link
              href="/admin/perfumes/new"
              className="btn-nurea btn-accent mt-2 inline-flex w-full shrink-0 justify-center text-[12px] tracking-[0.12em] sm:mt-0 sm:w-auto sm:min-w-[200px]"
            >
              Nouveau parfum
            </Link>
          ) : null}
        </div>

        {loadErr ? (
          <p className="mt-4 rounded-sm border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-3 py-2 text-[13px] text-[var(--nurea-accent)]">
            {loadErr}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-8 lg:mt-10 lg:flex-row lg:gap-10">
          <aside className="w-full shrink-0 space-y-4 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 lg:max-w-[320px] lg:p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--nurea-accent)]">
              Marques
            </h2>
            <ul className="max-h-[min(72vh,520px)] space-y-3 overflow-y-auto overscroll-contain text-[14px] text-[var(--nurea-text)]">
              {brands.length === 0 ? (
                <li className="text-[13px] text-[var(--nurea-text-subtle)]">Aucune marque pour l’instant.</li>
              ) : (
                brands.map((b) => (
                  <li
                    key={b.id}
                    className="border-b border-[var(--nurea-border)]/50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{b.name}</span>
                      <span className="shrink-0 text-[12px] text-[var(--nurea-text-subtle)]">
                        {b._count.perfumes} parfum{b._count.perfumes !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--nurea-text-muted)]">
                        Assortiment vitrine
                        <select
                          value={b.assortment}
                          disabled={!canEdit}
                          onChange={(e) => patchBrand(b.id, { assortment: e.target.value })}
                          className="mt-1 block min-h-11 w-full rounded-sm border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-2 py-2 text-[13px] text-[var(--nurea-text)] disabled:opacity-50"
                        >
                          {ASSORTMENT_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {BRAND_ASSORTMENT_LABELS[k].title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--nurea-text-muted)]">
                        Univers
                        <select
                          value={b.positioning}
                          disabled={!canEdit}
                          onChange={(e) => patchBrand(b.id, { positioning: e.target.value })}
                          className="mt-1 block min-h-11 w-full rounded-sm border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-2 py-2 text-[13px] text-[var(--nurea-text)] disabled:opacity-50"
                        >
                          {POSITIONING_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {BRAND_POSITIONING_LABELS[k].title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </li>
                ))
              )}
            </ul>
            <form onSubmit={addBrand} className="space-y-3 border-t border-[var(--nurea-border)] pt-4">
              <label className="block text-[12px] font-medium uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]">
                Nouvelle marque
                <input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Ex. Maison…"
                  className="mt-2 block min-h-12 w-full rounded-sm border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] disabled:opacity-50"
                />
              </label>
              {brandMsg ? (
                <p className="text-[13px] text-[var(--nurea-text-muted)]">{brandMsg}</p>
              ) : null}
              <button
                type="submit"
                disabled={!canEdit}
                className="btn-nurea w-full justify-center text-[12px] tracking-[0.12em] disabled:opacity-50"
              >
                Ajouter la marque
              </button>
            </form>
            {!canEdit ? (
              <p className="text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
                Compte en lecture seule : création et modification désactivées.
              </p>
            ) : null}
            <p className="text-[11px] leading-relaxed text-[var(--nurea-text-subtle)]">
              <span className="font-medium text-[var(--nurea-text-muted)]">Vitrine :</span>{" "}
              l’assortiment et l’univers alimentent le panneau « Explorer » sur l’accueil
              (paramètres d’URL{" "}
              <code className="text-[10px] text-[var(--nurea-text-muted)]">maison</code> /{" "}
              <code className="text-[10px] text-[var(--nurea-text-muted)]">univers</code>
              ).
            </p>
          </aside>

          <section className="min-w-0 flex-1 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]">
            <div className="flex flex-col gap-3 border-b border-[var(--nurea-border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--nurea-text-muted)]">
                  Parfums
                </h2>
                <p className="mt-0.5 text-[13px] text-[var(--nurea-text-subtle)]">
                  {filteredPerfumes.length} sur {perfumes.length}
                </p>
              </div>
              <label className="block w-full sm:max-w-xs">
                <span className="sr-only">Rechercher dans le catalogue</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Recherche (nom, marque, n°…)"
                  autoComplete="off"
                  className="block min-h-12 w-full rounded-sm border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)]"
                />
              </label>
            </div>

            {filteredPerfumes.length === 0 ? (
              <p className="p-6 text-center text-[14px] text-[var(--nurea-text-muted)]">
                {perfumes.length === 0
                  ? "Aucun parfum. Créez-en un ou importez via le seed."
                  : "Aucun résultat pour cette recherche."}
              </p>
            ) : (
              <>
                {/* Mobile + tablette : cartes */}
                <ul className="divide-y divide-[var(--nurea-border)] lg:hidden">
                  {filteredPerfumes.map((row) => (
                    <li key={row.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] text-[var(--nurea-text-subtle)]">#{row.id}</p>
                          <p className="mt-1 font-medium leading-snug text-[var(--nurea-text)]">{row.name}</p>
                          <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">{row.brand.name}</p>
                          <p className="mt-0.5 text-[12px] text-[var(--nurea-text-subtle)]">{row.category}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                            {row.deletedAt ? (
                              <span className="rounded-sm border border-[var(--nurea-accent)]/50 px-2 py-1 text-[11px] text-[var(--nurea-accent)]">
                                Masqué
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      {canEdit ? (
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          <Link
                            href={`/admin/perfumes/${row.id}/edit`}
                            className="btn-nurea btn-accent flex min-h-12 flex-1 items-center justify-center text-center text-[11px] tracking-[0.1em] sm:flex-none sm:px-6"
                          >
                            Modifier
                          </Link>
                          <button
                            type="button"
                            onClick={() => removePerfume(row.id, row.name)}
                            className="btn-nurea flex min-h-12 flex-1 items-center justify-center text-[11px] tracking-[0.1em] text-[var(--nurea-text-muted)] sm:flex-none sm:px-6"
                          >
                            Archiver
                          </button>
                        </div>
                      ) : (
                        <Link
                          href={`/admin/perfumes/${row.id}/edit`}
                          className="btn-nurea mt-4 flex min-h-12 w-full justify-center text-[11px] tracking-[0.1em]"
                        >
                          Voir la fiche
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Desktop : tableau */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead className="border-b border-[var(--nurea-border)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Nom</th>
                        <th className="px-4 py-3 font-medium">Marque</th>
                        <th className="px-4 py-3 font-medium">Catégorie</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPerfumes.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-[var(--nurea-border)]/60 transition-colors hover:bg-[var(--nurea-surface-hover)]"
                        >
                          <td className="px-4 py-3 font-mono text-[12px] text-[var(--nurea-text-subtle)]">
                            {row.id}
                          </td>
                          <td className="max-w-[200px] px-4 py-3 font-medium">
                            <span className="line-clamp-2">{row.name}</span>
                            {row.deletedAt ? (
                              <span className="ml-2 text-[10px] text-[var(--nurea-accent)]">masqué</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-[var(--nurea-text-muted)]">{row.brand.name}</td>
                          <td className="px-4 py-3 text-[var(--nurea-text-muted)]">{row.category}</td>
                          <td className="px-4 py-3">
                            <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canEdit ? (
                              <span className="inline-flex flex-wrap justify-end gap-2">
                                <Link
                                  href={`/admin/perfumes/${row.id}/edit`}
                                  className="inline-flex min-h-10 min-w-[5rem] items-center justify-center rounded-sm border border-[var(--nurea-accent)]/40 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--nurea-accent)] hover:bg-[var(--nurea-accent-subtle)]"
                                >
                                  Modifier
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removePerfume(row.id, row.name)}
                                  className="inline-flex min-h-10 min-w-[5rem] items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--nurea-text-muted)] hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)]"
                                >
                                  Archiver
                                </button>
                              </span>
                            ) : (
                              <Link
                                href={`/admin/perfumes/${row.id}/edit`}
                                className="inline-flex min-h-10 items-center justify-center rounded-sm border border-[var(--nurea-border-hover)] px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[var(--nurea-text-muted)] hover:text-[var(--nurea-text)]"
                              >
                                Voir
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

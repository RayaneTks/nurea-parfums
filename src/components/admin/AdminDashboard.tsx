"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Search,
  Trash2,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
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

type PerfumeFilter = "all" | "PUBLISHED" | "DRAFT" | "ARCHIVED";

function statusPillClass(status: string): string {
  const base =
    "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";
  if (status === "PUBLISHED")
    return `${base} bg-emerald-500/15 text-emerald-400`;
  if (status === "DRAFT")
    return `${base} bg-amber-500/15 text-amber-400`;
  if (status === "ARCHIVED")
    return `${base} bg-[var(--nurea-text-subtle)]/10 text-[var(--nurea-text-subtle)]`;
  return `${base} text-[var(--nurea-text-muted)]`;
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
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [perfumeFilter, setPerfumeFilter] = useState<PerfumeFilter>("all");

  // Brand management (collapsible section)
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [brandMsg, setBrandMsg] = useState<string | null>(null);

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
    let rows = perfumes;
    if (perfumeFilter !== "all") {
      rows = rows.filter((r) => r.status === perfumeFilter && !r.deletedAt);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.brand.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q),
    );
  }, [perfumes, search, perfumeFilter]);

  const canEdit = user?.role !== "VIEWER";

  async function removePerfume(id: number, name: string) {
    if (!confirm(`Archiver « ${name} » ?`)) return;
    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Erreur");
      return;
    }
    refresh();
  }

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

  async function patchBrand(
    id: string,
    patch: { assortment?: string; positioning?: string },
  ) {
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

  const filterPills: { id: PerfumeFilter; label: string }[] = [
    { id: "all", label: `Tous (${perfumes.length})` },
    {
      id: "PUBLISHED",
      label: `Publiés (${perfumes.filter((p) => p.status === "PUBLISHED" && !p.deletedAt).length})`,
    },
    {
      id: "DRAFT",
      label: `Brouillons (${perfumes.filter((p) => p.status === "DRAFT" && !p.deletedAt).length})`,
    },
    {
      id: "ARCHIVED",
      label: `Archivés (${perfumes.filter((p) => p.status === "ARCHIVED").length})`,
    },
  ];

  const selectClass =
    "block min-h-11 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-2 py-2 text-[14px] text-[var(--nurea-text)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <AdminNav />

      <main className="mx-auto max-w-[1200px] px-4 pb-6 pt-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-10 md:pt-8">
        {loadErr ? (
          <p
            className="mb-4 border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-4 py-3 text-[14px] text-[var(--nurea-accent)]"
            role="alert"
          >
            {loadErr}
          </p>
        ) : null}

        {/* Top bar: title + new button */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-2xl text-[var(--nurea-text)] md:text-3xl">
            Parfums
          </h1>
          {canEdit ? (
            <Link
              href="/admin/perfumes/new"
              className="inline-flex min-h-12 items-center gap-2 bg-[var(--nurea-accent)] px-5 text-[13px] font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)]"
            >
              <Plus className="h-5 w-5" aria-hidden />
              <span className="hidden sm:inline">Nouveau</span>
            </Link>
          ) : null}
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nurea-text-subtle)]"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un parfum, une marque…"
            autoComplete="off"
            className="block min-h-12 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] py-3 pl-10 pr-3 text-[15px] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {filterPills.map(({ id, label }) => {
            const active = perfumeFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPerfumeFilter(id)}
                className={clsx(
                  "shrink-0 min-h-9 border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]",
                  active
                    ? "border-[var(--nurea-accent)] bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                    : "border-[var(--nurea-border)] text-[var(--nurea-text-muted)] hover:border-[var(--nurea-border-hover)] hover:text-[var(--nurea-text)]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Perfume list */}
        <div className="mt-4">
          {filteredPerfumes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] text-[var(--nurea-text-muted)]">
                {perfumes.length === 0
                  ? "Aucun parfum. Commencez par en créer un."
                  : "Aucun résultat."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <ul className="space-y-2 lg:hidden">
                {filteredPerfumes.map((row) => (
                  <li
                    key={row.id}
                    className="border border-[var(--nurea-border)] bg-[var(--nurea-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-medium leading-snug text-[var(--nurea-text)]">
                          {row.name}
                        </p>
                        <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">
                          {row.brand.name}
                        </p>
                        <div className="mt-2">
                          <span className={statusPillClass(row.status)}>
                            {statusLabel(row.status)}
                          </span>
                          {row.deletedAt ? (
                            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[var(--nurea-accent)]">
                              <Archive className="h-3 w-3" aria-hidden />
                              masqué
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Link
                          href={`/admin/perfumes/${row.id}/edit`}
                          className="flex h-11 w-11 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
                          aria-label={`Modifier ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Link>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => removePerfume(row.id, row.name)}
                            className="flex h-11 w-11 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
                            aria-label={`Archiver ${row.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-[14px]">
                  <thead className="border-b border-[var(--nurea-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--nurea-text-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nom</th>
                      <th className="px-4 py-3 font-medium">Marque</th>
                      <th className="px-4 py-3 font-medium">Catégorie</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPerfumes.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[var(--nurea-border)]/60 transition-colors hover:bg-[var(--nurea-surface-hover)]"
                      >
                        <td className="max-w-[240px] px-4 py-3 font-medium">
                          <span className="line-clamp-1">{row.name}</span>
                          {row.deletedAt ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-[var(--nurea-accent)]">
                              <Archive className="h-3 w-3" aria-hidden />
                              masqué
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--nurea-text-muted)]">
                          {row.brand.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--nurea-text-muted)]">
                          {row.category}
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusPillClass(row.status)}>
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <Link
                              href={`/admin/perfumes/${row.id}/edit`}
                              className="inline-flex h-10 w-10 items-center justify-center border border-[var(--nurea-accent)]/40 text-[var(--nurea-accent)] transition-colors hover:border-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
                              aria-label={
                                canEdit
                                  ? `Modifier ${row.name}`
                                  : `Voir ${row.name}`
                              }
                            >
                              {canEdit ? (
                                <Pencil className="h-4 w-4" aria-hidden />
                              ) : (
                                <Eye className="h-4 w-4" aria-hidden />
                              )}
                            </Link>
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removePerfume(row.id, row.name)
                                }
                                className="inline-flex h-10 w-10 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
                                aria-label={`Archiver ${row.name}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Brands section (collapsible, secondary) */}
        <div className="mt-10 border-t border-[var(--nurea-border)] pt-6">
          <button
            type="button"
            onClick={() => setBrandsOpen((v) => !v)}
            className="flex w-full min-h-12 items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--nurea-cuivre)]" aria-hidden />
              <span className="text-[15px] font-semibold text-[var(--nurea-text)]">
                Gérer les marques
              </span>
              <span className="text-[13px] text-[var(--nurea-text-muted)]">
                ({brands.length})
              </span>
            </span>
            {brandsOpen ? (
              <ChevronUp className="h-5 w-5 text-[var(--nurea-text-muted)]" aria-hidden />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--nurea-text-muted)]" aria-hidden />
            )}
          </button>

          {brandsOpen ? (
            <div className="mt-4 space-y-4">
              {/* Brand list */}
              <ul className="divide-y divide-[var(--nurea-border)]">
                {brands.length === 0 ? (
                  <li className="py-6 text-center text-[14px] text-[var(--nurea-text-muted)]">
                    Aucune marque.
                  </li>
                ) : (
                  brands.map((b) => (
                    <li key={b.id} className="py-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-[var(--nurea-text)]">
                          {b.name}
                        </p>
                        <span className="text-[12px] text-[var(--nurea-text-subtle)]">
                          {b._count.perfumes} parfum
                          {b._count.perfumes !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--nurea-text-muted)]">
                          Assortiment
                          <select
                            value={b.assortment}
                            disabled={!canEdit}
                            onChange={(e) =>
                              patchBrand(b.id, { assortment: e.target.value })
                            }
                            className={selectClass}
                          >
                            {ASSORTMENT_KEYS.map((k) => (
                              <option key={k} value={k}>
                                {BRAND_ASSORTMENT_LABELS[k].title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--nurea-text-muted)]">
                          Univers
                          <select
                            value={b.positioning}
                            disabled={!canEdit}
                            onChange={(e) =>
                              patchBrand(b.id, { positioning: e.target.value })
                            }
                            className={selectClass}
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

              {/* Add brand form */}
              {canEdit ? (
                <form
                  onSubmit={addBrand}
                  className="flex gap-2 border-t border-[var(--nurea-border)] pt-4"
                >
                  <input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Nouvelle marque…"
                    className="min-h-12 flex-1 border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 text-[15px] text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-12 items-center gap-2 bg-[var(--nurea-accent)] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)]"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Ajouter
                  </button>
                </form>
              ) : null}
              {brandMsg ? (
                <p className="text-[13px] text-[var(--nurea-text-muted)]">
                  {brandMsg}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

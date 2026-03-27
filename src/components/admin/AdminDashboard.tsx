"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  Eye,
} from "lucide-react";
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
type Tab = "perfumes" | "brands";

function StatusDot({ status }: { status: string }) {
  const color =
    status === "PUBLISHED"
      ? "bg-emerald-500"
      : status === "DRAFT"
        ? "bg-amber-400"
        : "bg-gray-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function statusLabel(status: string): string {
  if (status === "PUBLISHED") return "Publie";
  if (status === "DRAFT") return "Brouillon";
  if (status === "ARCHIVED") return "Archive";
  return status;
}

const selectCls =
  "block w-full appearance-none rounded-md border border-black/10 bg-white px-2 py-1.5 pr-8 text-[13px] text-[#1a1a1a] focus-visible:border-blue-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5]";

export function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [perfumeFilter, setPerfumeFilter] = useState<PerfumeFilter>("all");
  const [tab, setTab] = useState<Tab>("perfumes");

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
      setBrandMsg(j.error ?? "Refuse");
      return;
    }
    setNewBrand("");
    setBrandMsg("Marque creee.");
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
      alert(j.error ?? "Mise a jour impossible");
      return;
    }
    await refresh();
  }

  const filterPills: { id: PerfumeFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: perfumes.length },
    { id: "PUBLISHED", label: "Publies", count: perfumes.filter((p) => p.status === "PUBLISHED" && !p.deletedAt).length },
    { id: "DRAFT", label: "Brouillons", count: perfumes.filter((p) => p.status === "DRAFT" && !p.deletedAt).length },
    { id: "ARCHIVED", label: "Archives", count: perfumes.filter((p) => p.status === "ARCHIVED").length },
  ];

  return (
    <div className="min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pt-8">
        {loadErr && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">
            {loadErr}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-black/[0.03] p-1 dark:bg-white/[0.04]">
          {([
            { id: "perfumes" as Tab, label: "Parfums" },
            { id: "brands" as Tab, label: "Marques" },
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${
                tab === id
                  ? "bg-white text-[#1a1a1a] shadow-sm dark:bg-white/[0.08] dark:text-white"
                  : "text-[#888] hover:text-[#555] dark:text-[#666] dark:hover:text-[#aaa]"
              }`}
            >
              {label}
              <span className="ml-1.5 text-[11px] opacity-60">
                {id === "perfumes" ? perfumes.length : brands.length}
              </span>
            </button>
          ))}
        </div>

        {/* ============ Perfumes tab ============ */}
        {tab === "perfumes" && (
          <div className="mt-5">
            {/* Search */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                autoComplete="off"
                className="block min-h-[44px] w-full rounded-md border border-black/10 bg-white py-2.5 pl-10 pr-3 text-[15px] text-[#1a1a1a] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]"
              />
            </div>

            {/* Filter pills */}
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              {filterPills.map(({ id, label, count }) => {
                const active = perfumeFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPerfumeFilter(id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all ${
                      active
                        ? "bg-blue-500 text-white"
                        : "bg-black/[0.04] text-[#888] hover:bg-black/[0.06] dark:bg-white/[0.04] dark:text-[#777] dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {label}
                    <span className="ml-1 opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Perfume list */}
            <div className="mt-4">
              {filteredPerfumes.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-[14px] text-[#999]">
                    {perfumes.length === 0 ? "Aucun parfum. Creez-en un." : "Aucun resultat."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {filteredPerfumes.map((row) => (
                    <li key={row.id} className="group flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium leading-snug text-[#1a1a1a] dark:text-[#e5e5e5]">
                          {row.name}
                          {row.deletedAt && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-red-500">
                              <Archive className="h-3 w-3" aria-hidden />
                              masque
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-[13px] text-[#999]">
                          <span>{row.brand.name}</span>
                          <span className="text-[#ddd] dark:text-[#444]">·</span>
                          <span className="flex items-center gap-1">
                            <StatusDot status={row.status} />
                            {statusLabel(row.status)}
                          </span>
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Link
                          href={`/admin/perfumes/${row.id}/edit`}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-[#aaa] transition-colors hover:bg-black/[0.04] hover:text-[#555] dark:hover:bg-white/[0.06] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          aria-label={canEdit ? `Modifier ${row.name}` : `Voir ${row.name}`}
                        >
                          {canEdit ? (
                            <Pencil className="h-4 w-4" aria-hidden />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden />
                          )}
                        </Link>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removePerfume(row.id, row.name)}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-[#aaa] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            aria-label={`Archiver ${row.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ============ Brands tab ============ */}
        {tab === "brands" && (
          <div className="mt-5 space-y-4">
            {canEdit && (
              <form onSubmit={addBrand} className="flex gap-2">
                <input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="Nouvelle marque…"
                  className="min-h-[44px] flex-1 rounded-md border border-black/10 bg-white px-3 text-[15px] text-[#1a1a1a] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]"
                />
                <button
                  type="submit"
                  className="flex min-h-[44px] items-center gap-1.5 rounded-md bg-blue-500 px-4 text-[13px] font-medium text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter
                </button>
              </form>
            )}
            {brandMsg && (
              <p className="text-[13px] text-[#999]">{brandMsg}</p>
            )}

            {brands.length === 0 ? (
              <p className="py-12 text-center text-[14px] text-[#999]">Aucune marque.</p>
            ) : (
              <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {brands.map((b) => (
                  <li key={b.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[15px] font-medium text-[#1a1a1a] dark:text-[#e5e5e5]">
                        {b.name}
                      </p>
                      <span className="text-[12px] text-[#bbb] dark:text-[#666]">
                        {b._count.perfumes} parfum{b._count.perfumes !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Assortiment</label>
                        <div className="relative mt-0.5">
                          <select
                            value={b.assortment}
                            disabled={!canEdit}
                            onChange={(e) => patchBrand(b.id, { assortment: e.target.value })}
                            className={selectCls}
                          >
                            {ASSORTMENT_KEYS.map((k) => (
                              <option key={k} value={k}>{BRAND_ASSORTMENT_LABELS[k].title}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bbb]" aria-hidden />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Univers</label>
                        <div className="relative mt-0.5">
                          <select
                            value={b.positioning}
                            disabled={!canEdit}
                            onChange={(e) => patchBrand(b.id, { positioning: e.target.value })}
                            className={selectCls}
                          >
                            {POSITIONING_KEYS.map((k) => (
                              <option key={k} value={k}>{BRAND_POSITIONING_LABELS[k].title}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bbb]" aria-hidden />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* FAB mobile — new perfume */}
      {canEdit && tab === "perfumes" && (
        <Link
          href="/admin/perfumes/new"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-xl active:scale-95 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Nouveau parfum"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Link>
      )}
    </div>
  );
}

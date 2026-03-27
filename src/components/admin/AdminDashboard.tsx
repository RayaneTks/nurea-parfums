"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AdminNav } from "./AdminNav";

type SessionUser = { username: string; role: string };

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  image: string | null;
  _count: { perfumes: number };
};

const CATALOG_MODE_KEYS = ["CURATED", "COMPLETE"] as const;

type PerfumeRow = {
  id: number;
  name: string;
  status: string;
  brand: { name: string };
};

type PerfumeFilter = "all" | "PUBLISHED" | "DRAFT";
type Tab = "perfumes" | "brands";

function StatusDot({ status }: { status: string }) {
  const color =
    status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function statusLabel(status: string): string {
  if (status === "PUBLISHED") return "Visible";
  if (status === "DRAFT") return "Masque";
  return status;
}

function ConfirmDeleteModal({
  target,
  onCancel,
  onConfirm,
}: {
  target: { id: number; name: string };
  onCancel: () => void;
  onConfirm: (id: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirmer la suppression de ${target.name}`}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-md border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] leading-relaxed text-[#1a1a1a] dark:text-[#e5e5e5]">
          Supprimer definitivement &laquo;&nbsp;{target.name}&nbsp;&raquo;&nbsp;?
          Cette action est irreversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-md px-4 text-[13px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] dark:text-[#999] dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target.id)}
            className="min-h-[44px] rounded-md bg-red-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());

  const [newBrand, setNewBrand] = useState("");
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const [brandImageDrafts, setBrandImageDrafts] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const [s, b, p] = await Promise.all([
        fetch("/api/admin/session", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/brands", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/perfumes", { credentials: "include", cache: "no-store" }),
      ]);
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      if (b.ok) {
        const bj = (await b.json()) as { brands: BrandRow[] };
        setBrands(bj.brands ?? []);
        setBrandImageDrafts(
          Object.fromEntries((bj.brands ?? []).map((row) => [row.id, row.image ?? ""])),
        );
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

  const perfumesOnly = perfumes;

  const filteredPerfumes = useMemo(() => {
    let rows = perfumesOnly;
    if (perfumeFilter !== "all") {
      rows = rows.filter((r) => r.status === perfumeFilter);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.brand.name.toLowerCase().includes(q),
    );
  }, [perfumesOnly, search, perfumeFilter]);

  const canEdit = user?.role !== "VIEWER";

  async function toggleVisibility(id: number, currentStatus: string) {
    const next = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setPendingStatusIds((prev) => new Set(prev).add(id));
    setPerfumes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: next } : p)),
    );
    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Erreur");
      setPerfumes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: currentStatus } : p)),
      );
      setPendingStatusIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
      return;
    }
    await refresh();
    setPendingStatusIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  }

  async function hardDelete(id: number) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Erreur");
      setPendingDeleteIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
      return;
    }
    setPerfumes((prev) => prev.filter((p) => p.id !== id));
    setDeleteTarget(null);
    await refresh();
    setPendingDeleteIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
  }

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    setBrandMsg(null);
    const name = newBrand.trim();
    if (name.length < 2) return;
    try {
      const r = await fetch("/api/admin/brands", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, catalogMode: "CURATED" }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) {
        setBrandMsg(j.error ?? "Création refusée.");
        return;
      }
      setNewBrand("");
      setBrandMsg("Marque créée.");
      refresh();
    } catch {
      setBrandMsg("Erreur réseau. Réessayez.");
    }
  }

  async function patchBrand(
    id: string,
    patch: { catalogMode?: "CURATED" | "COMPLETE"; image?: string | null },
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

  const filterPills: { id: PerfumeFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: perfumesOnly.length },
    { id: "PUBLISHED", label: "Visibles", count: perfumesOnly.filter((p) => p.status === "PUBLISHED").length },
    { id: "DRAFT", label: "Masqués", count: perfumesOnly.filter((p) => p.status === "DRAFT").length },
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
                {id === "perfumes" ? perfumesOnly.length : brands.length}
              </span>
            </button>
          ))}
        </div>

        {/* ============ Perfumes tab ============ */}
        {tab === "perfumes" && (
          <div className="mt-5">
            {canEdit && (
              <div className="mb-3 hidden md:flex">
                <Link
                  href="/admin/perfumes/new"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-blue-500 px-4 text-[13px] font-medium text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter un parfum
                </Link>
              </div>
            )}
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
                    {perfumesOnly.length === 0 ? "Aucun parfum. Créez-en un." : "Aucun résultat."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {filteredPerfumes.map((row, idx) => (
                    <li key={row.id} className={`group flex items-center gap-3 py-3 ${idx % 2 === 0 ? "bg-black/[0.015] dark:bg-white/[0.02]" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium leading-snug text-[#1a1a1a] dark:text-[#e5e5e5]">
                          {row.name}
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
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Link>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleVisibility(row.id, row.status)}
                              disabled={pendingStatusIds.has(row.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-md text-[#aaa] transition-colors hover:bg-black/[0.04] hover:text-[#555] dark:hover:bg-white/[0.06] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              aria-label={row.status === "PUBLISHED" ? `Masquer ${row.name}` : `Rendre visible ${row.name}`}
                            >
                              {row.status === "PUBLISHED" ? (
                                <Eye className="h-4 w-4" aria-hidden />
                              ) : (
                                <EyeOff className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                              disabled={pendingDeleteIds.has(row.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-md text-[#aaa] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              aria-label={`Supprimer ${row.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </>
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
                {brands.map((b, idx) => (
                  <li key={b.id} className={`py-4 ${idx % 2 === 0 ? "bg-black/[0.015] dark:bg-white/[0.02]" : ""}`}>
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
                        <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Mode de catalogue</label>
                        <div className="relative mt-0.5">
                          <select
                            value={b.catalogMode}
                            disabled={!canEdit}
                            onChange={(e) =>
                              patchBrand(b.id, {
                                catalogMode: e.target.value as "CURATED" | "COMPLETE",
                              })
                            }
                            className={selectCls}
                          >
                            {CATALOG_MODE_KEYS.map((k) => (
                              <option key={k} value={k}>
                                {k === "COMPLETE" ? "Gamme complète" : "Parfums sélectionnés"}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bbb]" aria-hidden />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">
                          Image marque
                        </label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            value={brandImageDrafts[b.id] ?? ""}
                            onChange={(e) =>
                              setBrandImageDrafts((prev) => ({
                                ...prev,
                                [b.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              b.catalogMode === "COMPLETE"
                                ? "Image obligatoire (URL ou /public)"
                                : "Image facultative"
                            }
                            className="min-h-[36px] flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[12px] text-[#1a1a1a] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              patchBrand(b.id, {
                                image: (brandImageDrafts[b.id] ?? "").trim() || null,
                              })
                            }
                            className="min-h-[36px] rounded-md border border-black/10 px-2.5 text-[11px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                          >
                            Enregistrer
                          </button>
                        </div>
                        {b.catalogMode === "COMPLETE" && !(brandImageDrafts[b.id] ?? "").trim() && (
                          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                            Image requise en gamme complète.
                          </p>
                        )}
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={hardDelete}
        />
      )}
    </div>
  );
}

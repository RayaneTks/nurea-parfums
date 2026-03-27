"use client";

import Image from "next/image";
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
  X,
} from "lucide-react";
import { AdminNav } from "./AdminNav";

type SessionUser = { username: string; role: string };

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
  _count: { perfumes: number };
};

const CATALOG_MODE_KEYS = ["CURATED", "COMPLETE"] as const;

type PerfumeRow = {
  id: number;
  image: string;
  imageLight: string | null;
  name: string;
  status: string;
  brand: { id: string; name: string; image: string | null; catalogMode: "CURATED" | "COMPLETE"; status: "PUBLISHED" | "DRAFT" };
};

type PerfumeFilter = "all" | "PUBLISHED" | "DRAFT";
type BrandFilter = "all" | "COMPLETE" | "CURATED" | "DRAFT";
type Tab = "perfumes" | "brands";

const VISUAL_SIZE = 52;

const selectCls =
  "block w-full min-h-[44px] appearance-none border border-black/[0.08] bg-white px-3 pr-8 text-sm text-[#111] focus-visible:border-blue-500 focus-visible:outline-none dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#eee]";

const inputCls =
  "block min-h-[44px] w-full border border-black/[0.08] bg-white px-3 text-sm text-[#111] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#eee] dark:placeholder:text-[#555]";

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-400"
      }`}
    />
  );
}

function BrandVisual({ name, image }: { name: string; image: string | null }) {
  if (image?.trim()) {
    return (
      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden bg-black/[0.02] dark:bg-white/[0.04]">
        <Image src={image} alt={name} width={VISUAL_SIZE} height={VISUAL_SIZE} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center border border-dashed border-black/[0.15] bg-black/[0.02] text-[11px] font-semibold uppercase tracking-wider text-[#999] dark:border-white/[0.15] dark:bg-white/[0.04] dark:text-[#666]">
      {name.slice(0, 2)}
    </div>
  );
}

function BrandInlineBadge({ name, image }: { name: string; image: string | null }) {
  if (image?.trim()) {
    return (
      <div className="relative h-5 w-5 shrink-0 overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
        <Image src={image} alt={name} fill className="object-cover" sizes="20px" />
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center border border-dashed border-black/[0.15] text-[9px] font-semibold uppercase text-[#999] dark:border-white/[0.15] dark:text-[#666]">
      {name.slice(0, 1)}
    </div>
  );
}

function PerfumeVisual({ name, image, imageLight }: { name: string; image: string; imageLight: string | null }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="relative h-[52px] w-[40px] overflow-hidden bg-black/[0.02] dark:bg-white/[0.04]">
        <Image src={image} alt={name} fill className="object-cover" sizes="40px" />
      </div>
      {imageLight?.trim() ? (
        <div className="relative h-[52px] w-[40px] overflow-hidden bg-black/[0.02] dark:bg-white/[0.04]">
          <Image src={imageLight} alt={`${name} (clair)`} fill className="object-cover" sizes="40px" />
        </div>
      ) : null}
    </div>
  );
}

function BrandModeBadge({ mode }: { mode: "CURATED" | "COMPLETE" }) {
  if (mode === "COMPLETE") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
        Gamme complète
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-500/20 dark:text-sky-300">
      Sélection
    </span>
  );
}

function statusLabel(status: string): string {
  if (status === "PUBLISHED") return "Visible";
  if (status === "DRAFT") return "Masqué";
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
        className="mx-4 w-full max-w-sm border border-black/[0.08] bg-white p-6 shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed text-[#111] dark:text-[#eee]">
          Supprimer définitivement &laquo;&nbsp;{target.name}&nbsp;&raquo;&nbsp;?
          Cette action est irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 text-sm font-medium text-[#555] transition-colors hover:bg-black/[0.04] dark:text-[#aaa] dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target.id)}
            className="min-h-[44px] bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmBrandDeleteModal({
  target,
  onCancel,
  onConfirm,
}: {
  target: { id: string; name: string; count: number };
  onCancel: () => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirmer la suppression de la marque ${target.name}`}
    >
      <div
        className="mx-4 w-full max-w-sm border border-black/[0.08] bg-white p-6 shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm leading-relaxed text-[#111] dark:text-[#eee]">
          Supprimer définitivement &laquo;&nbsp;{target.name}&nbsp;&raquo;&nbsp;?
          <br />
          {target.count > 0
            ? `Cette action supprime aussi ${target.count} parfum${target.count > 1 ? "s" : ""} lié${target.count > 1 ? "s" : ""}.`
            : "Aucun parfum lié ne sera supprimé."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-4 text-sm font-medium text-[#555] transition-colors hover:bg-black/[0.04] dark:text-[#aaa] dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target.id)}
            className="min-h-[44px] bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

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
  const [newBrandMode, setNewBrandMode] = useState<"CURATED" | "COMPLETE">("CURATED");
  const [newBrandImage, setNewBrandImage] = useState("");
  const [showBrandCreateForm, setShowBrandCreateForm] = useState(false);
  const [brandImageDrafts, setBrandImageDrafts] = useState<Record<string, string>>({});
  const [brandNameDrafts, setBrandNameDrafts] = useState<Record<string, string>>({});
  const [brandSearch, setBrandSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [pendingBrandIds, setPendingBrandIds] = useState<Set<string>>(new Set());
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<{ id: string; name: string; count: number } | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const hasMutationInFlight = pendingDeleteIds.size > 0 || pendingStatusIds.size > 0;

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const s = await fetch("/api/admin/session", { credentials: "include", cache: "no-store" });
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      const b = await fetch("/api/admin/brands", { credentials: "include", cache: "no-store" });
      if (b.ok) {
        const bj = (await readJsonSafe<{ brands: BrandRow[] }>(b)) ?? { brands: [] };
        setBrands(bj.brands ?? []);
        setBrandImageDrafts(
          Object.fromEntries((bj.brands ?? []).map((row) => [row.id, row.image ?? ""])),
        );
        setBrandNameDrafts(
          Object.fromEntries((bj.brands ?? []).map((row) => [row.id, row.name])),
        );
      }
      const p = await fetch("/api/admin/perfumes", { credentials: "include", cache: "no-store" });
      if (p.ok) {
        const pj = (await readJsonSafe<{ perfumes: PerfumeRow[] }>(p)) ?? { perfumes: [] };
        setPerfumes(pj.perfumes ?? []);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    if (!actionMsg) return;
    const t = setTimeout(() => setActionMsg(null), 2500);
    return () => clearTimeout(t);
  }, [actionMsg]);

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

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    let rows = brands;
    if (brandFilter === "COMPLETE") rows = rows.filter((b) => b.catalogMode === "COMPLETE");
    if (brandFilter === "CURATED") rows = rows.filter((b) => b.catalogMode === "CURATED");
    if (brandFilter === "DRAFT") rows = rows.filter((b) => b.status === "DRAFT");
    if (q) {
      return rows.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [brands, brandSearch, brandFilter]);

  const canEdit = user?.role !== "VIEWER";

  async function toggleVisibility(id: number, currentStatus: string) {
    if (hasMutationInFlight) return;
    const row = perfumes.find((p) => p.id === id);
    if (!row) return;
    const next = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    if (next === "PUBLISHED" && row.brand.catalogMode === "COMPLETE") {
      setActionMsg({ type: "error", text: "Impossible : la marque est en gamme complète." });
      return;
    }
    if (next === "PUBLISHED" && row.brand.status === "DRAFT") {
      setActionMsg({ type: "error", text: "Impossible : la marque est masquée." });
      return;
    }
    setPendingStatusIds((prev) => new Set(prev).add(id));
    setPerfumes((prev) => prev.map((p) => (p.id === id ? { ...p, status: next } : p)));
    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Changement impossible." });
      setPerfumes((prev) => prev.map((p) => (p.id === id ? { ...p, status: currentStatus } : p)));
      setPendingStatusIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
      return;
    }
    setPendingStatusIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
    setActionMsg({ type: "success", text: next === "PUBLISHED" ? "Parfum visible." : "Parfum masqué." });
  }

  async function hardDelete(id: number) {
    if (hasMutationInFlight) return;
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const deletedPerfume = perfumes.find((p) => p.id === id);
    const r = await fetch(`/api/admin/perfumes/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
      setPendingDeleteIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
      return;
    }
    setPerfumes((prev) => prev.filter((p) => p.id !== id));
    if (deletedPerfume) {
      setBrands((prev) =>
        prev.map((b) =>
          b.id === deletedPerfume.brand.id
            ? { ...b, _count: { perfumes: Math.max(0, b._count.perfumes - 1) } }
            : b,
        ),
      );
    }
    setDeleteTarget(null);
    setPendingDeleteIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
    setActionMsg({ type: "success", text: "Parfum supprimé." });
  }

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    const name = newBrand.trim();
    const image = newBrandImage.trim();
    if (name.length < 2) return;
    if (newBrandMode === "COMPLETE" && !image) {
      setActionMsg({ type: "error", text: "Ajoutez une image pour une gamme complète." });
      return;
    }
    setIsAddingBrand(true);
    try {
      const r = await fetch("/api/admin/brands", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, catalogMode: newBrandMode, image: image || null }),
      });
      const j = await readJsonSafe<{ error?: string; brand?: BrandRow }>(r);
      if (!r.ok) {
        setActionMsg({ type: "error", text: j?.error ?? "Création refusée." });
        return;
      }
      setNewBrand("");
      setNewBrandMode("CURATED");
      setNewBrandImage("");
      setShowBrandCreateForm(false);
      if (j?.brand) {
        const created = j.brand;
        setBrands((prev) => [...prev, created].sort((a, z) => a.name.localeCompare(z.name, "fr")));
        setBrandImageDrafts((prev) => ({ ...prev, [created.id]: created.image ?? "" }));
        setBrandNameDrafts((prev) => ({ ...prev, [created.id]: created.name }));
        setActionMsg({ type: "success", text: "Marque créée." });
      } else {
        refresh();
      }
    } catch {
      setActionMsg({ type: "error", text: "Erreur réseau." });
    } finally {
      setIsAddingBrand(false);
    }
  }

  async function patchBrand(
    id: string,
    patch: { name?: string; catalogMode?: "CURATED" | "COMPLETE"; status?: "PUBLISHED" | "DRAFT"; image?: string | null },
  ) {
    const r = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Mise à jour impossible." });
      return;
    }
    const j = await readJsonSafe<{ brand?: BrandRow }>(r);
    if (j?.brand) {
      const updated = j.brand;
      setBrands((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setPerfumes((prev) =>
        prev.map((p) => {
          if (p.brand.id !== id) return p;
          const shouldForceDraft = updated.catalogMode === "COMPLETE" || updated.status === "DRAFT";
          return {
            ...p,
            status: shouldForceDraft ? "DRAFT" : p.status,
            brand: { ...p.brand, catalogMode: updated.catalogMode, status: updated.status },
          };
        }),
      );
      setBrandImageDrafts((prev) => ({ ...prev, [id]: updated.image ?? "" }));
      setBrandNameDrafts((prev) => ({ ...prev, [id]: updated.name }));
      setActionMsg({ type: "success", text: "Marque mise à jour." });
      setEditingBrandId(null);
    } else {
      await refresh();
      setActionMsg({ type: "success", text: "Marque mise à jour." });
    }
  }

  async function deleteBrand(id: string) {
    setPendingBrandIds((prev) => new Set(prev).add(id));
    try {
      const r = await fetch(`/api/admin/brands/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
        return;
      }
      setBrands((prev) => prev.filter((b) => b.id !== id));
      setBrandDeleteTarget(null);
      if (editingBrandId === id) setEditingBrandId(null);
      setActionMsg({ type: "success", text: "Marque supprimée." });
    } finally {
      setPendingBrandIds((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
    }
  }

  const filterPills: { id: PerfumeFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: perfumesOnly.length },
    { id: "PUBLISHED", label: "Visibles", count: perfumesOnly.filter((p) => p.status === "PUBLISHED").length },
    { id: "DRAFT", label: "Masqués", count: perfumesOnly.filter((p) => p.status === "DRAFT").length },
  ];
  const brandFilterPills: { id: BrandFilter; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: brands.length },
    { id: "COMPLETE", label: "Gammes complètes", count: brands.filter((b) => b.catalogMode === "COMPLETE").length },
    { id: "CURATED", label: "Sélections", count: brands.filter((b) => b.catalogMode === "CURATED").length },
    { id: "DRAFT", label: "Masquées", count: brands.filter((b) => b.status === "DRAFT").length },
  ];

  const groupedPerfumes = useMemo(() => {
    const byBrand = new Map<string, PerfumeRow[]>();
    for (const row of filteredPerfumes) {
      const key = row.brand.name;
      const list = byBrand.get(key) ?? [];
      list.push(row);
      byBrand.set(key, list);
    }
    return [...byBrand.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([brandName, rows]) => ({
        brandName,
        rows: [...rows].sort((a, b) => a.name.localeCompare(b.name, "fr")),
      }));
  }, [filteredPerfumes]);

  return (
    <div className="min-h-screen">
      <AdminNav />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <header className="mb-6">
          <h1 className="text-lg font-semibold text-[#111] dark:text-white">
            Panel admin
          </h1>
          <p className="mt-0.5 text-sm text-[#888]">
            Parfums et marques du catalogue.
          </p>
        </header>

        {loadErr && (
          <div className="mb-4 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">
            {loadErr}
          </div>
        )}

        <nav className="flex border-b border-black/[0.08] dark:border-white/[0.08]">
          {([
            { id: "perfumes" as Tab, label: "Parfums", count: perfumesOnly.length },
            { id: "brands" as Tab, label: "Marques", count: brands.length },
          ]).map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 pb-3 pt-1 text-center text-sm font-medium transition-colors ${
                tab === id
                  ? "border-b-2 border-[#111] text-[#111] dark:border-white dark:text-white"
                  : "text-[#999] hover:text-[#555] dark:text-[#666] dark:hover:text-[#bbb]"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-50">{count}</span>
            </button>
          ))}
        </nav>

        {/* ─── Parfums ─── */}
        {tab === "perfumes" && (
          <section className="mt-5">
            {canEdit && (
              <div className="mb-4 hidden md:block">
                <Link
                  href="/admin/perfumes/new"
                  className="inline-flex min-h-[44px] items-center gap-2 bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter un parfum
                </Link>
              </div>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                autoComplete="off"
                className={`${inputCls} py-2.5 pl-10 pr-11`}
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#999] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {filterPills.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPerfumeFilter(id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    perfumeFilter === id
                      ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
                      : "bg-black/[0.04] text-[#777] hover:bg-black/[0.06] dark:bg-white/[0.06] dark:text-[#888] dark:hover:bg-white/[0.1]"
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              {filteredPerfumes.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-[#999]">
                    {perfumesOnly.length === 0 ? "Aucun parfum. Créez-en un." : "Aucun résultat."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedPerfumes.map((group) => (
                    <section key={group.brandName} className="border border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                      <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5 dark:border-white/[0.06]">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#888] dark:text-[#999]">
                          {group.brandName}
                        </p>
                        <span className="text-xs text-[#bbb] dark:text-[#666]">{group.rows.length}</span>
                      </div>
                      <ul className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                        {group.rows.map((row) => (
                          <li key={row.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                            <PerfumeVisual name={row.name} image={row.image} imageLight={row.imageLight} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#111] dark:text-[#eee]">{row.name}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#888] dark:text-[#999]">
                                <BrandInlineBadge name={row.brand.name} image={row.brand.image} />
                                <span className="truncate">{row.brand.name}</span>
                                <span className="text-[#ddd] dark:text-[#444]">·</span>
                                <span className="flex items-center gap-1">
                                  <StatusDot status={row.status} />
                                  {statusLabel(row.status)}
                                </span>
                              </p>
                            </div>
                            <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:gap-1">
                              <Link
                                href={`/admin/perfumes/${row.id}/edit`}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 border border-black/[0.08] text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] dark:border-white/[0.08] dark:text-[#aaa] dark:hover:bg-white/[0.06] sm:h-11 sm:w-11 sm:border-0"
                                aria-label={canEdit ? `Modifier ${row.name}` : `Voir ${row.name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                <span className="sm:hidden">{canEdit ? "Modifier" : "Voir"}</span>
                              </Link>
                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => toggleVisibility(row.id, row.status)}
                                    disabled={hasMutationInFlight || pendingStatusIds.has(row.id)}
                                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 border border-black/[0.08] text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/[0.08] dark:text-[#aaa] dark:hover:bg-white/[0.06] sm:h-11 sm:w-11 sm:border-0"
                                    aria-label={row.status === "PUBLISHED" ? `Masquer ${row.name}` : `Rendre visible ${row.name}`}
                                  >
                                    {row.status === "PUBLISHED" ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                                    <span className="sm:hidden">{row.status === "PUBLISHED" ? "Masquer" : "Publier"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                                    disabled={hasMutationInFlight || pendingDeleteIds.has(row.id)}
                                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 sm:h-11 sm:w-11"
                                    aria-label={`Supprimer ${row.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                    <span className="sm:hidden">Supprimer</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Marques ─── */}
        {tab === "brands" && (
          <section className="mt-5 space-y-4">
            {canEdit && (
              <div className="hidden md:block">
                <button
                  type="button"
                  onClick={() => setShowBrandCreateForm((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-2 bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter une marque
                </button>
              </div>
            )}

            {canEdit && showBrandCreateForm && (
              <form onSubmit={addBrand} className="border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-[#888]">Nom de la marque</label>
                    <input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="Ex : Dior"
                      className={`${inputCls} mt-1.5`}
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs font-medium text-[#888]">Mode de catalogue</label>
                    <div className="relative mt-1.5">
                      <select
                        value={newBrandMode}
                        onChange={(e) => setNewBrandMode(e.target.value as "CURATED" | "COMPLETE")}
                        className={selectCls}
                      >
                        {CATALOG_MODE_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k === "COMPLETE" ? "Gamme complète" : "Parfums sélectionnés"}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bbb]" aria-hidden />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-[#888]">Image (URL ou chemin public)</label>
                    <input
                      value={newBrandImage}
                      onChange={(e) => setNewBrandImage(e.target.value)}
                      placeholder={newBrandMode === "COMPLETE" ? "Obligatoire en gamme complète" : "Facultative"}
                      className={`${inputCls} mt-1.5`}
                    />
                    {newBrandMode === "COMPLETE" && !newBrandImage.trim() && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Image requise en gamme complète.</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowBrandCreateForm(false); setNewBrand(""); setNewBrandMode("CURATED"); setNewBrandImage(""); }}
                    className="min-h-[44px] px-3 text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingBrand || newBrand.trim().length < 2}
                    className="inline-flex min-h-[44px] items-center gap-2 bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {isAddingBrand ? "Ajout…" : "Créer"}
                  </button>
                </div>
              </form>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]" aria-hidden />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Rechercher une marque…"
                className={`${inputCls} py-2.5 pl-10 pr-11`}
              />
              {brandSearch.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setBrandSearch("")}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#999] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {brandFilterPills.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBrandFilter(id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    brandFilter === id
                      ? "bg-[#111] text-white dark:bg-white dark:text-[#111]"
                      : "bg-black/[0.04] text-[#777] hover:bg-black/[0.06] dark:bg-white/[0.06] dark:text-[#888] dark:hover:bg-white/[0.1]"
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-[#888]">
              {filteredBrands.length} résultat{filteredBrands.length > 1 ? "s" : ""}
            </p>

            {filteredBrands.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#999]">
                Aucune marque. Ajoutez-en une.
              </p>
            ) : (
              <ul className="divide-y divide-black/[0.06] border border-black/[0.08] bg-white dark:divide-white/[0.06] dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                {filteredBrands.map((b) => (
                  <li key={b.id} className="px-4 py-4">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <BrandVisual name={b.name} image={b.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#111] dark:text-[#eee]">{b.name}</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#888] dark:text-[#999]">
                            <BrandModeBadge mode={b.catalogMode} />
                            <span className="flex items-center gap-1">
                              <StatusDot status={b.status} />
                              {b.status === "PUBLISHED" ? "Visible" : "Masquée"}
                            </span>
                          </p>
                          {b.catalogMode === "CURATED" && (
                            <button
                              type="button"
                              onClick={() => { setTab("perfumes"); setSearch(b.name); setPerfumeFilter("all"); }}
                              className="inline-flex min-h-[28px] items-center text-xs text-[#777] underline decoration-dotted underline-offset-2 hover:text-[#444] dark:text-[#999] dark:hover:text-[#eee]"
                            >
                              {b._count.perfumes} parfum{b._count.perfumes !== 1 ? "s" : ""}
                            </button>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:gap-1">
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() => patchBrand(b.id, { status: b.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 border border-black/[0.08] text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/[0.08] dark:text-[#aaa] dark:hover:bg-white/[0.06] sm:h-11 sm:w-11 sm:border-0"
                            aria-label={b.status === "PUBLISHED" ? `Masquer ${b.name}` : `Rendre visible ${b.name}`}
                          >
                            {b.status === "PUBLISHED" ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                            <span className="sm:hidden">{b.status === "PUBLISHED" ? "Masquer" : "Publier"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() => setEditingBrandId((prev) => (prev === b.id ? null : b.id))}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 border border-black/[0.08] text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/[0.08] dark:text-[#aaa] dark:hover:bg-white/[0.06] sm:h-11 sm:w-11 sm:border-0"
                            aria-label={`Modifier ${b.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            <span className="sm:hidden">Modifier</span>
                          </button>
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() => setBrandDeleteTarget({ id: b.id, name: b.name, count: b._count.perfumes })}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 sm:h-11 sm:w-11"
                            aria-label={`Supprimer ${b.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            <span className="sm:hidden">Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {editingBrandId === b.id && canEdit && (
                      <div className="mt-3 border border-black/[0.06] bg-black/[0.02] p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#888]">Modifier</p>
                          <button
                            type="button"
                            onClick={() => setEditingBrandId(null)}
                            className="flex h-11 w-11 items-center justify-center text-[#888] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                            aria-label="Fermer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-medium text-[#888]">Nom</label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                value={brandNameDrafts[b.id] ?? ""}
                                onChange={(e) => setBrandNameDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                className="min-h-[44px] flex-1 border border-black/[0.08] bg-white px-3 text-sm text-[#111] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#eee]"
                              />
                              <button
                                type="button"
                                disabled={!canEdit || pendingBrandIds.has(b.id)}
                                onClick={() => patchBrand(b.id, { name: (brandNameDrafts[b.id] ?? "").trim() })}
                                className="min-h-[44px] border border-black/[0.08] px-3 text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/[0.08] dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                              >
                                Renommer
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <label className="text-xs font-medium text-[#888]">Mode</label>
                            <div className="relative mt-1">
                              <select
                                value={b.catalogMode}
                                disabled={!canEdit || pendingBrandIds.has(b.id)}
                                onChange={(e) => patchBrand(b.id, { catalogMode: e.target.value as "CURATED" | "COMPLETE" })}
                                className={selectCls}
                              >
                                {CATALOG_MODE_KEYS.map((k) => (
                                  <option key={k} value={k}>{k === "COMPLETE" ? "Gamme complète" : "Parfums sélectionnés"}</option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bbb]" aria-hidden />
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-[#888]">Image</label>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <input
                                value={brandImageDrafts[b.id] ?? ""}
                                onChange={(e) => setBrandImageDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                placeholder={b.catalogMode === "COMPLETE" ? "Obligatoire (URL ou /public)" : "Facultative"}
                                className="min-h-[44px] min-w-0 flex-1 border border-black/[0.08] bg-white px-3 text-sm text-[#111] placeholder:text-[#bbb] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#eee] dark:placeholder:text-[#555]"
                              />
                              <button
                                type="button"
                                disabled={!canEdit || pendingBrandIds.has(b.id)}
                                onClick={() => patchBrand(b.id, { image: (brandImageDrafts[b.id] ?? "").trim() || null })}
                                className="min-h-[44px] border border-black/[0.08] px-3 text-xs font-medium text-[#555] transition-colors hover:bg-black/[0.04] disabled:opacity-40 dark:border-white/[0.08] dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                disabled={!canEdit || pendingBrandIds.has(b.id) || !(brandImageDrafts[b.id] ?? "").trim()}
                                onClick={() => patchBrand(b.id, { image: null })}
                                className="min-h-[44px] px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                              >
                                Retirer
                              </button>
                            </div>
                            {b.catalogMode === "COMPLETE" && !(brandImageDrafts[b.id] ?? "").trim() && (
                              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Image requise en gamme complète.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {actionMsg && (
        <div
          className={`fixed bottom-4 left-1/2 z-[120] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 border px-4 py-3 text-sm shadow-lg ${
            actionMsg.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          }`}
          role="status"
        >
          {actionMsg.text}
        </div>
      )}

      {canEdit && tab === "perfumes" && (
        <Link
          href="/admin/perfumes/new"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-95 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Nouveau parfum"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Link>
      )}
      {canEdit && tab === "brands" && !showBrandCreateForm && (
        <button
          type="button"
          onClick={() => setShowBrandCreateForm(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-95 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Nouvelle marque"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal target={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={hardDelete} />
      )}
      {brandDeleteTarget && (
        <ConfirmBrandDeleteModal target={brandDeleteTarget} onCancel={() => setBrandDeleteTarget(null)} onConfirm={deleteBrand} />
      )}
    </div>
  );
}

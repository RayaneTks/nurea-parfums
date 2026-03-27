"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
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
  "min-h-[44px] w-full appearance-none rounded-xl bg-zinc-800/70 px-3 pr-8 text-sm text-zinc-100 transition-all duration-200 focus-visible:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

const inputCls =
  "min-h-[44px] w-full rounded-xl bg-zinc-800/70 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus-visible:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full h-2 w-2 ${
        status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-400"
      }`}
    />
  );
}

function BrandVisual({ name, image }: { name: string; image: string | null }) {
  if (image?.trim()) {
    return (
      <div className="relative h-[52px] w-[52px] shrink-0 rounded-xl overflow-hidden">
        <Image src={image} alt={name} width={VISUAL_SIZE} height={VISUAL_SIZE} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
      {name.slice(0, 2)}
    </div>
  );
}

function BrandInlineBadge({ name, image }: { name: string; image: string | null }) {
  if (image?.trim()) {
    return (
      <div className="relative h-5 w-5 shrink-0 rounded-[6px] overflow-hidden">
        <Image src={image} alt={name} fill className="object-cover" sizes="20px" />
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-zinc-800 text-[9px] font-semibold uppercase text-zinc-500">
      {name.slice(0, 1)}
    </div>
  );
}

function PerfumeVisual({ name, image, imageLight }: { name: string; image: string; imageLight: string | null }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <div className="relative h-[52px] w-[40px] rounded-xl overflow-hidden">
        <Image src={image} alt={name} fill className="object-cover" sizes="40px" />
      </div>
      {imageLight?.trim() ? (
        <div className="relative h-[52px] w-[40px] rounded-xl overflow-hidden">
          <Image src={imageLight} alt={`${name} (clair)`} fill className="object-cover" sizes="40px" />
        </div>
      ) : null}
    </div>
  );
}

function BrandModeBadge({ mode }: { mode: "CURATED" | "COMPLETE" }) {
  if (mode === "COMPLETE") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
        Gamme complète
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirmer la suppression de ${target.name}`}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[14px] leading-relaxed text-zinc-300">
          Supprimer définitivement &laquo;&nbsp;{target.name}&nbsp;&raquo;&nbsp;?
          Cette action est irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-xl bg-zinc-800 px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target.id)}
            className="min-h-[44px] rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Confirmer la suppression de la marque ${target.name}`}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[14px] leading-relaxed text-zinc-300">
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
            className="min-h-[44px] rounded-xl bg-zinc-800 px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(target.id)}
            className="min-h-[44px] rounded-xl bg-red-500 px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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

function normalizeBrandRow(row: Partial<BrandRow>, fallback?: BrandRow): BrandRow {
  return {
    id: row.id ?? fallback?.id ?? "",
    name: row.name ?? fallback?.name ?? "",
    slug: row.slug ?? fallback?.slug ?? "",
    catalogMode: (row.catalogMode ?? fallback?.catalogMode ?? "CURATED") as BrandRow["catalogMode"],
    status: (row.status ?? fallback?.status ?? "DRAFT") as BrandRow["status"],
    image: row.image ?? fallback?.image ?? null,
    _count: {
      perfumes: row._count?.perfumes ?? fallback?._count?.perfumes ?? 0,
    },
  };
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
      setBrands((bj.brands ?? []).map((row) => normalizeBrandRow(row)));
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
      const j = await readJsonSafe<{ error?: string; brand?: Partial<BrandRow> }>(r);
      if (!r.ok) {
        setActionMsg({ type: "error", text: j?.error ?? "Création refusée." });
        return;
      }
      setNewBrand("");
      setNewBrandMode("CURATED");
      setNewBrandImage("");
      setShowBrandCreateForm(false);
      if (j?.brand) {
        const created = normalizeBrandRow(j.brand);
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
    const j = await readJsonSafe<{ brand?: Partial<BrandRow> }>(r);
    const brandPayload = j?.brand;
    if (brandPayload) {
      setBrands((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          return normalizeBrandRow(brandPayload, b);
        }),
      );
      const updated = normalizeBrandRow(brandPayload, brands.find((b) => b.id === id));
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
    <div className="min-h-screen bg-zinc-950">
      <AdminNav />

      <main className="mx-auto max-w-4xl px-5 pb-28 pt-6">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-100">Catalogue</h1>
          <p className="mt-1 text-[13px] text-zinc-500">{perfumesOnly.length} parfums · {brands.length} marques</p>
        </div>

        {loadErr && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{loadErr}</span>
          </div>
        )}

        <div className="grid grid-cols-2 rounded-full bg-zinc-900 p-1">
          {([
            { id: "perfumes" as Tab, label: "Parfums", count: perfumesOnly.length },
            { id: "brands" as Tab, label: "Marques", count: brands.length },
          ]).map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                tab === id
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
              <span className="text-xs opacity-60">{count}</span>
            </button>
          ))}
        </div>

        {tab === "perfumes" && (
          <section className="mt-6">
            {canEdit && (
              <div className="mb-4 hidden md:block">
                <Link
                  href="/admin/perfumes/new"
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-blue-500 px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-blue-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter
                </Link>
              </div>
            )}

            <div className="flex items-center rounded-xl bg-zinc-900 px-4">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher"
                autoComplete="off"
                className="min-h-[44px] flex-1 bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none"
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-300"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filterPills.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPerfumeFilter(id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    perfumeFilter === id
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>

            <div className="mt-1 px-1">
              <p className="text-[12px] text-zinc-500">{filteredPerfumes.length} résultat{filteredPerfumes.length > 1 ? "s" : ""}</p>
            </div>

            <div className="mt-3">
              {filteredPerfumes.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[14px] text-zinc-500">
                    {perfumesOnly.length === 0 ? "Aucun parfum. Créez-en un." : "Aucun résultat."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedPerfumes.map((group) => (
                    <section key={group.brandName} className="overflow-hidden rounded-2xl bg-zinc-900">
                      <div className="flex items-center justify-between px-5 py-3">
                        <p className="text-[12px] font-medium uppercase tracking-wider text-zinc-500">
                          {group.brandName}
                        </p>
                        <span className="text-[12px] text-zinc-500">{group.rows.length}</span>
                      </div>
                      <ul className="divide-y divide-zinc-800/50">
                        {group.rows.map((row) => (
                          <li key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                            <PerfumeVisual name={row.name} image={row.image} imageLight={row.imageLight} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-100">{row.name}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                                <BrandInlineBadge name={row.brand.name} image={row.brand.image} />
                                <span className="truncate">{row.brand.name}</span>
                                <span className="text-zinc-600">·</span>
                                <span className="flex items-center gap-1">
                                  <StatusDot status={row.status} />
                                  {statusLabel(row.status)}
                                </span>
                              </p>
                            </div>
                            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:gap-1">
                              <Link
                                href={`/admin/perfumes/${row.id}/edit`}
                                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-zinc-400 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-200 sm:h-9 sm:w-9 sm:bg-zinc-800 sm:hover:bg-zinc-700"
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
                                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-zinc-400 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40 sm:h-9 sm:w-9 sm:bg-zinc-800 sm:hover:bg-zinc-700"
                                    aria-label={row.status === "PUBLISHED" ? `Masquer ${row.name}` : `Rendre visible ${row.name}`}
                                  >
                                    {row.status === "PUBLISHED" ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                                    <span className="sm:hidden">{row.status === "PUBLISHED" ? "Masquer" : "Publier"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                                    disabled={hasMutationInFlight || pendingDeleteIds.has(row.id)}
                                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-red-400 transition-all duration-200 hover:bg-red-500/15 disabled:opacity-40 sm:h-9 sm:w-9"
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

        {tab === "brands" && (
          <section className="mt-6 space-y-4">
            {canEdit && (
              <div className="hidden md:block">
                <button
                  type="button"
                  onClick={() => setShowBrandCreateForm((prev) => !prev)}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-blue-500 px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-blue-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter
                </button>
              </div>
            )}

            {canEdit && showBrandCreateForm && (
              <form onSubmit={addBrand} className="rounded-2xl bg-zinc-900 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-400">Nom de la marque</label>
                    <input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="Ex : Dior"
                      className={`${inputCls} mt-1.5`}
                    />
                  </div>
                  <div className="relative">
                    <label className="text-xs font-medium text-zinc-400">Mode de catalogue</label>
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
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-zinc-400">Image (URL ou chemin public)</label>
                    <input
                      value={newBrandImage}
                      onChange={(e) => setNewBrandImage(e.target.value)}
                      placeholder={newBrandMode === "COMPLETE" ? "Obligatoire en gamme complète" : "Facultative"}
                      className={`${inputCls} mt-1.5`}
                    />
                    {newBrandMode === "COMPLETE" && !newBrandImage.trim() && (
                      <p className="mt-1 text-xs text-amber-400">Image requise en gamme complète.</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowBrandCreateForm(false); setNewBrand(""); setNewBrandMode("CURATED"); setNewBrandImage(""); }}
                    className="min-h-[44px] rounded-xl bg-zinc-800 px-4 text-xs font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingBrand || newBrand.trim().length < 2}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-500 px-4 text-xs font-semibold text-white transition-all duration-200 hover:bg-blue-400 active:scale-[0.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {isAddingBrand ? "Ajout…" : "Créer"}
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center rounded-xl bg-zinc-900 px-4">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Rechercher"
                className="min-h-[44px] flex-1 bg-transparent px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none"
              />
              {brandSearch.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setBrandSearch("")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-300"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {brandFilterPills.map(({ id, label, count }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setBrandFilter(id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                    brandFilter === id
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {label}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              ))}
            </div>

            <p className="text-[12px] text-zinc-500">
              {filteredBrands.length} résultat{filteredBrands.length > 1 ? "s" : ""}
            </p>

            {filteredBrands.length === 0 ? (
              <p className="py-20 text-center text-[14px] text-zinc-500">
                Aucune marque. Ajoutez-en une.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800/50 overflow-hidden rounded-2xl bg-zinc-900">
                {filteredBrands.map((b) => (
                  <li key={b.id} className="px-5 py-4">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <BrandVisual name={b.name} image={b.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{b.name}</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
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
                              className="inline-flex min-h-[28px] items-center text-xs text-zinc-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-zinc-200"
                            >
                              {b._count?.perfumes ?? 0} parfum{(b._count?.perfumes ?? 0) !== 1 ? "s" : ""}
                            </button>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:gap-1">
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() => patchBrand(b.id, { status: b.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-zinc-400 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40 sm:h-9 sm:w-9 sm:bg-zinc-800 sm:hover:bg-zinc-700"
                            aria-label={b.status === "PUBLISHED" ? `Masquer ${b.name}` : `Rendre visible ${b.name}`}
                          >
                            {b.status === "PUBLISHED" ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                            <span className="sm:hidden">{b.status === "PUBLISHED" ? "Masquer" : "Publier"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() => setEditingBrandId((prev) => (prev === b.id ? null : b.id))}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-zinc-400 transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40 sm:h-9 sm:w-9 sm:bg-zinc-800 sm:hover:bg-zinc-700"
                            aria-label={`Modifier ${b.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            <span className="sm:hidden">Modifier</span>
                          </button>
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() =>
                              setBrandDeleteTarget({
                                id: b.id,
                                name: b.name,
                                count: b._count?.perfumes ?? 0,
                              })
                            }
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-medium text-red-400 transition-all duration-200 hover:bg-red-500/15 disabled:opacity-40 sm:h-9 sm:w-9"
                            aria-label={`Supprimer ${b.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            <span className="sm:hidden">Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {editingBrandId === b.id && canEdit && (
                      <div className="mt-3 rounded-xl bg-zinc-800/50 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Modifier</p>
                          <button
                            type="button"
                            onClick={() => setEditingBrandId(null)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-all duration-200 hover:bg-zinc-700 hover:text-zinc-300"
                            aria-label="Fermer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-medium text-zinc-400">Nom</label>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                value={brandNameDrafts[b.id] ?? ""}
                                onChange={(e) => setBrandNameDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                className="min-h-[44px] flex-1 rounded-xl bg-zinc-800 px-3 text-sm text-zinc-100 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              />
                              <button
                                type="button"
                                disabled={!canEdit || pendingBrandIds.has(b.id)}
                                onClick={() => patchBrand(b.id, { name: (brandNameDrafts[b.id] ?? "").trim() })}
                                className="min-h-[44px] rounded-xl bg-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-600 disabled:opacity-40"
                              >
                                Renommer
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <label className="text-xs font-medium text-zinc-400">Mode</label>
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
                              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden />
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-medium text-zinc-400">Image</label>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <input
                                value={brandImageDrafts[b.id] ?? ""}
                                onChange={(e) => setBrandImageDrafts((prev) => ({ ...prev, [b.id]: e.target.value }))}
                                placeholder={b.catalogMode === "COMPLETE" ? "Obligatoire (URL ou /public)" : "Facultative"}
                                className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-zinc-800 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              />
                              <button
                                type="button"
                                disabled={!canEdit || pendingBrandIds.has(b.id)}
                                onClick={() => patchBrand(b.id, { image: (brandImageDrafts[b.id] ?? "").trim() || null })}
                                className="min-h-[44px] rounded-xl bg-zinc-700 px-3 text-xs font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-600 disabled:opacity-40"
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                disabled={!canEdit || pendingBrandIds.has(b.id) || !(brandImageDrafts[b.id] ?? "").trim()}
                                onClick={() => patchBrand(b.id, { image: null })}
                                className="min-h-[44px] rounded-xl px-3 text-xs font-medium text-red-400 transition-all duration-200 hover:bg-red-500/15 disabled:opacity-40"
                              >
                                Retirer
                              </button>
                            </div>
                            {b.catalogMode === "COMPLETE" && !(brandImageDrafts[b.id] ?? "").trim() && (
                              <p className="mt-1 text-xs text-amber-400">Image requise en gamme complète.</p>
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
          className={`fixed bottom-4 left-1/2 z-[120] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-[13px] shadow-xl shadow-black/30 backdrop-blur-xl ${
            actionMsg.type === "success"
              ? "bg-zinc-900/95 text-zinc-200"
              : "bg-zinc-900/95 text-zinc-200"
          }`}
          role="status"
        >
          {actionMsg.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
          )}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {canEdit && tab === "perfumes" && (
        <Link
          href="/admin/perfumes/new"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl shadow-blue-500/25 transition-all duration-200 hover:bg-blue-400 active:scale-[0.95] md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Nouveau parfum"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </Link>
      )}
      {canEdit && tab === "brands" && !showBrandCreateForm && (
        <button
          type="button"
          onClick={() => setShowBrandCreateForm(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl shadow-blue-500/25 transition-all duration-200 hover:bg-blue-400 active:scale-[0.95] md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

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

function StatusDot({ status }: { status: string }) {
  const color =
    status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function BrandVisual({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  if (image?.trim()) {
    return (
      <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-md border border-black/10 bg-[var(--nurea-surface)] dark:border-white/10">
        <Image
          src={image}
          alt={`Visuel ${name}`}
          width={VISUAL_SIZE}
          height={VISUAL_SIZE}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-md border border-dashed border-black/20 bg-black/[0.02] text-[11px] font-semibold uppercase tracking-wide text-[#777] dark:border-white/20 dark:bg-white/[0.04] dark:text-[#aaa]">
      {name.slice(0, 2)}
    </div>
  );
}

function BrandInlineBadge({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  if (image?.trim()) {
    return (
      <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-[4px] border border-black/10 dark:border-white/10">
        <Image src={image} alt={`Icône ${name}`} fill className="object-cover" sizes="20px" />
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-dashed border-black/20 text-[9px] font-semibold uppercase text-[#777] dark:border-white/20 dark:text-[#aaa]">
      {name.slice(0, 1)}
    </div>
  );
}

function PerfumeVisual({
  name,
  image,
  imageLight,
}: {
  name: string;
  image: string;
  imageLight: string | null;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="relative h-[52px] w-[40px] overflow-hidden rounded-md border border-black/10 bg-[var(--nurea-surface)] dark:border-white/10">
        <Image src={image} alt={`Visuel principal ${name}`} fill className="object-cover" sizes="40px" />
      </div>
      {imageLight?.trim() ? (
        <div className="relative h-[52px] w-[40px] overflow-hidden rounded-md border border-black/10 bg-[var(--nurea-surface)] dark:border-white/10">
          <Image
            src={imageLight}
            alt={`Visuel clair ${name}`}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      ) : null}
    </div>
  );
}

function BrandModeBadge({ mode }: { mode: "CURATED" | "COMPLETE" }) {
  if (mode === "COMPLETE") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-300">
        Gamme complète
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-sky-300 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:border-sky-400/40 dark:bg-sky-500/20 dark:text-sky-300">
      Sélection
    </span>
  );
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
        className="mx-4 w-full max-w-sm rounded-md border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[15px] leading-relaxed text-[#1a1a1a] dark:text-[#e5e5e5]">
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
      setActionMsg({
        type: "error",
        text: "Impossible de rendre visible ce parfum: sa marque est en gamme complète.",
      });
      return;
    }
    if (next === "PUBLISHED" && row.brand.status === "DRAFT") {
      setActionMsg({
        type: "error",
        text: "Impossible de rendre visible ce parfum: sa marque est masquée.",
      });
      return;
    }
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
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Changement de visibilité impossible." });
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
    setPendingStatusIds((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
    setActionMsg({ type: "success", text: next === "PUBLISHED" ? "Parfum rendu visible." : "Parfum masqué." });
  }

  async function hardDelete(id: number) {
    if (hasMutationInFlight) return;
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const deletedPerfume = perfumes.find((p) => p.id === id);
    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
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
        body: JSON.stringify({
          name,
          catalogMode: newBrandMode,
          image: image || null,
        }),
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
        setBrands((prev) =>
          [...prev, created].sort((a, z) => a.name.localeCompare(z.name, "fr")),
        );
        setBrandImageDrafts((prev) => ({ ...prev, [created.id]: created.image ?? "" }));
        setBrandNameDrafts((prev) => ({ ...prev, [created.id]: created.name }));
        setActionMsg({ type: "success", text: "Marque créée." });
      } else {
        refresh();
      }
    } catch {
      setActionMsg({ type: "error", text: "Erreur réseau. Réessayez." });
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
        setActionMsg({ type: "error", text: j?.error ?? "Mise à jour impossible" });
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
      const r = await fetch(`/api/admin/brands/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible" });
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

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:pt-8">
        <header className="mb-5">
          <h1 className="text-[20px] font-semibold text-[#1a1a1a] dark:text-[#f0f0f0] md:text-[22px]">
            Panel admin
          </h1>
          <p className="mt-1 text-[13px] text-[#7b7b7b] dark:text-[#9a9a9a]">
            Gérez rapidement les parfums et les marques depuis mobile ou desktop.
          </p>
        </header>
        {loadErr && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">
            {loadErr}
          </div>
        )}
        {actionMsg && (
          <div
            className={`fixed bottom-4 left-1/2 z-[120] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-md border px-4 py-3 text-[14px] shadow-lg ${
              actionMsg.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
            }`}
            role="status"
          >
            {actionMsg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-black/[0.08] pb-2 dark:border-white/[0.1]">
          {([
            { id: "perfumes" as Tab, label: "Parfums" },
            { id: "brands" as Tab, label: "Marques" },
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-md border px-3 py-2.5 text-[13px] font-medium transition-all ${
                tab === id
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/12 dark:text-blue-300"
                  : "border-black/[0.08] bg-transparent text-[#777] hover:bg-black/[0.03] dark:border-white/[0.1] dark:text-[#999] dark:hover:bg-white/[0.05]"
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
                className="block min-h-[44px] w-full rounded-md border border-black/10 bg-white py-2.5 pl-10 pr-11 text-[15px] text-[#1a1a1a] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]"
              />
              {search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-black/[0.05] hover:text-[#555] dark:text-[#777] dark:hover:bg-white/[0.08] dark:hover:text-[#ddd]"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
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
                <div className="space-y-4">
                  {groupedPerfumes.map((group) => (
                    <section key={group.brandName} className="rounded-md border border-black/[0.08] bg-white p-4 dark:border-white/[0.12] dark:bg-[#161616]">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#5f5f5f] dark:text-[#aaaaaa]">
                          {group.brandName}
                        </p>
                        <span className="text-[11px] text-[#8a8a8a] dark:text-[#7f7f7f]">
                          {group.rows.length} parfum{group.rows.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {group.rows.map((row, idx) => (
                          <li
                            key={row.id}
                            className={`group flex flex-col items-start gap-3 rounded-md border px-3 py-3.5 sm:flex-row sm:items-center sm:gap-4 ${
                              idx % 2 === 0
                                ? "border-black/[0.08] bg-[#fafafa] dark:border-white/[0.11] dark:bg-[#1f1f1f]"
                                : "border-black/[0.08] bg-white dark:border-white/[0.11] dark:bg-[#191919]"
                            }`}
                          >
                      <PerfumeVisual name={row.name} image={row.image} imageLight={row.imageLight} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium leading-snug text-[#1a1a1a] dark:text-[#ededed]">
                          {row.name}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#8a8a8a] dark:text-[#9f9f9f]">
                          <BrandInlineBadge name={row.brand.name} image={row.brand.image} />
                          <span className="truncate">{row.brand.name}</span>
                          <span className="text-[#cfcfcf] dark:text-[#4f4f4f]">·</span>
                          <span className="flex items-center gap-1">
                            <StatusDot status={row.status} />
                            {statusLabel(row.status)}
                          </span>
                        </p>
                      </div>

                      <div className="grid w-full shrink-0 grid-cols-3 gap-2 pt-1 sm:flex sm:w-auto sm:justify-end sm:gap-1.5 sm:pt-0">
                        <Link
                          href={`/admin/perfumes/${row.id}/edit`}
                          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-black/[0.08] bg-white/70 px-2 text-[12px] font-medium text-[#565656] transition-colors hover:bg-black/[0.05] hover:text-[#2f2f2f] dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-[#b0b0b0] dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-11 sm:w-11 sm:border-transparent sm:bg-transparent sm:px-0 sm:text-[#8f8f8f]"
                          aria-label={canEdit ? `Modifier ${row.name}` : `Voir ${row.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                          <span className="sm:hidden">{canEdit ? "Modifier" : "Voir"}</span>
                        </Link>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleVisibility(row.id, row.status)}
                              disabled={hasMutationInFlight || pendingStatusIds.has(row.id)}
                              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-black/[0.08] bg-white/70 px-2 text-[12px] font-medium text-[#565656] transition-colors hover:bg-black/[0.05] hover:text-[#2f2f2f] disabled:opacity-50 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-[#b0b0b0] dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-11 sm:w-11 sm:border-transparent sm:bg-transparent sm:px-0 sm:text-[#8f8f8f]"
                              aria-label={row.status === "PUBLISHED" ? `Masquer ${row.name}` : `Rendre visible ${row.name}`}
                            >
                              {row.status === "PUBLISHED" ? (
                                <Eye className="h-4 w-4" aria-hidden />
                              ) : (
                                <EyeOff className="h-4 w-4" aria-hidden />
                              )}
                              <span className="sm:hidden">{row.status === "PUBLISHED" ? "Masquer" : "Publier"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
                              disabled={hasMutationInFlight || pendingDeleteIds.has(row.id)}
                              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50/70 px-2 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/18 sm:h-11 sm:w-11 sm:border-transparent sm:bg-transparent sm:px-0 sm:text-[#8f8f8f]"
                              aria-label={`Supprimer ${row.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
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
          </div>
        )}

        {/* ============ Brands tab ============ */}
        {tab === "brands" && (
          <div className="mt-5 space-y-4">
            {canEdit && (
              <div className="hidden md:flex">
                <button
                  type="button"
                  onClick={() => setShowBrandCreateForm((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-blue-500 px-4 text-[13px] font-medium text-white transition-all hover:bg-blue-600 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter une marque
                </button>
              </div>
            )}
            {canEdit && showBrandCreateForm && (
              <form
                onSubmit={addBrand}
                className="rounded-md border border-black/[0.08] bg-white/[0.65] p-3 dark:border-white/[0.08] dark:bg-white/[0.03]"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Nom de la marque</label>
                    <input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      placeholder="Ex: Dior"
                      className="mt-1.5 min-h-[44px] w-full rounded-md border border-black/10 bg-white px-3 text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Mode de catalogue</label>
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
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#bbb]" aria-hidden />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">
                      Image marque (URL ou chemin `public`)
                    </label>
                    <input
                      value={newBrandImage}
                      onChange={(e) => setNewBrandImage(e.target.value)}
                      placeholder={newBrandMode === "COMPLETE" ? "Image obligatoire en gamme complète" : "Image facultative"}
                      className="mt-1.5 min-h-[44px] w-full rounded-md border border-black/10 bg-white px-3 text-[14px] text-[#1a1a1a] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]"
                    />
                    {newBrandMode === "COMPLETE" && !newBrandImage.trim() && (
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        Une image est requise pour une gamme complète.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBrandCreateForm(false);
                      setNewBrand("");
                      setNewBrandMode("CURATED");
                      setNewBrandImage("");
                    }}
                    className="min-h-[44px] rounded-md border border-black/10 px-3 text-[12px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingBrand || newBrand.trim().length < 2}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-blue-500 px-3 text-[12px] font-semibold text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {isAddingBrand ? "Ajout…" : "Créer la marque"}
                  </button>
                </div>
              </form>
            )}

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa]"
                aria-hidden
              />
              <input
                type="search"
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                placeholder="Rechercher une marque…"
                className="block min-h-[44px] w-full rounded-md border border-black/10 bg-white py-2.5 pl-10 pr-11 text-[15px] text-[#1a1a1a] placeholder:text-[#bbb] focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5] dark:placeholder:text-[#666]"
              />
              {brandSearch.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setBrandSearch("")}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[#999] transition-colors hover:bg-black/[0.05] hover:text-[#555] dark:text-[#777] dark:hover:bg-white/[0.08] dark:hover:text-[#ddd]"
                  aria-label="Effacer la recherche marque"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              {brandFilterPills.map(({ id, label, count }) => {
                const active = brandFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBrandFilter(id)}
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
            <p className="text-[12px] text-[#777] dark:text-[#909090]">
              {filteredBrands.length} résultat{filteredBrands.length > 1 ? "s" : ""} affiché{filteredBrands.length > 1 ? "s" : ""}
            </p>

            {filteredBrands.length === 0 ? (
              <p className="py-12 text-center text-[14px] text-[#999]">
                Aucune marque. Ajoutez-en une pour alimenter le catalogue.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredBrands.map((b, idx) => (
                  <li
                    key={b.id}
                    className={`rounded-md border px-3 py-4 ${
                      idx % 2 === 0
                        ? "border-black/[0.08] bg-[#fafafa] dark:border-white/[0.12] dark:bg-[#1f1f1f]"
                        : "border-black/[0.08] bg-white dark:border-white/[0.12] dark:bg-[#191919]"
                    }`}
                  >
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <BrandVisual
                        name={b.name}
                        image={b.image}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-[#1a1a1a] dark:text-[#e5e5e5]">
                          {b.name}
                        </p>
                        <div className="mt-1 space-y-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#8a8a8a] dark:text-[#9f9f9f]">
                            <BrandModeBadge mode={b.catalogMode} />
                            <span className="flex items-center gap-1">
                              <StatusDot status={b.status} />
                              {b.status === "PUBLISHED" ? "Visible" : "Masquée"}
                            </span>
                          </p>
                          {b.catalogMode === "CURATED" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTab("perfumes");
                                setSearch(b.name);
                                setPerfumeFilter("all");
                              }}
                              className="inline-flex min-h-[28px] items-center text-[13px] text-[#6f6f6f] underline decoration-dotted underline-offset-2 hover:text-[#444] dark:text-[#a5a5a5] dark:hover:text-[#e0e0e0]"
                            >
                              {b._count.perfumes} parfum{b._count.perfumes !== 1 ? "s" : ""}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="grid w-full shrink-0 grid-cols-3 gap-2 pt-1 sm:flex sm:w-auto sm:justify-end sm:gap-1.5 sm:pt-0">
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() =>
                              patchBrand(b.id, {
                                status: b.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                              })
                            }
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-black/[0.08] bg-white/70 px-2 text-[12px] font-medium text-[#565656] transition-colors hover:bg-black/[0.05] hover:text-[#2f2f2f] disabled:opacity-50 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-[#b0b0b0] dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-11 sm:w-11 sm:border-transparent sm:bg-transparent sm:px-0 sm:text-[#7b7b7b]"
                            aria-label={b.status === "PUBLISHED" ? `Masquer ${b.name}` : `Rendre visible ${b.name}`}
                          >
                            {b.status === "PUBLISHED" ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                            <span className="sm:hidden">{b.status === "PUBLISHED" ? "Masquer" : "Publier"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() => setEditingBrandId((prev) => (prev === b.id ? null : b.id))}
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-black/[0.08] bg-white/70 px-2 text-[12px] font-medium text-[#565656] transition-colors hover:bg-black/[0.05] hover:text-[#2f2f2f] disabled:opacity-50 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-[#b0b0b0] dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-11 sm:w-11 sm:border-transparent sm:bg-transparent sm:px-0 sm:text-[#7b7b7b]"
                            aria-label={`Modifier ${b.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            <span className="sm:hidden">Modifier</span>
                          </button>
                          <button
                            type="button"
                            disabled={pendingBrandIds.has(b.id)}
                            onClick={() =>
                              setBrandDeleteTarget({
                                id: b.id,
                                name: b.name,
                                count: b._count.perfumes,
                              })
                            }
                            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50/70 px-2 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/18 sm:h-11 sm:w-11 sm:border-transparent sm:bg-transparent sm:px-0 sm:text-red-500"
                            aria-label={`Supprimer ${b.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            <span className="sm:hidden">Supprimer</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {editingBrandId === b.id && canEdit && (
                      <div className="mt-3 rounded-md border border-black/[0.08] bg-white/[0.65] p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#888]">
                            Modifier la marque
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditingBrandId(null)}
                            className="flex h-11 w-11 items-center justify-center rounded-md text-[#888] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                            aria-label="Fermer la modification"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Nom marque</label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            value={brandNameDrafts[b.id] ?? ""}
                            onChange={(e) =>
                              setBrandNameDrafts((prev) => ({
                                ...prev,
                                [b.id]: e.target.value,
                              }))
                            }
                            className="min-h-[44px] flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[12px] text-[#1a1a1a] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5]"
                          />
                          <button
                            type="button"
                            disabled={!canEdit || pendingBrandIds.has(b.id)}
                            onClick={() => patchBrand(b.id, { name: (brandNameDrafts[b.id] ?? "").trim() })}
                            className="min-h-[44px] rounded-md border border-black/10 px-2.5 text-[11px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/10 dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                          >
                            Renommer
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <label className="text-[11px] font-medium text-[#aaa] dark:text-[#666]">Mode de catalogue</label>
                        <div className="relative mt-0.5">
                          <select
                            value={b.catalogMode}
                            disabled={!canEdit || pendingBrandIds.has(b.id)}
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
                      <div className="sm:col-span-2">
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
                            className="min-h-[44px] flex-1 rounded-md border border-black/10 bg-white px-2 py-1.5 text-[12px] text-[#1a1a1a] dark:border-white/10 dark:bg-white/[0.04] dark:text-[#e5e5e5]"
                          />
                          <button
                            type="button"
                            disabled={!canEdit || pendingBrandIds.has(b.id)}
                            onClick={() =>
                              patchBrand(b.id, {
                                image: (brandImageDrafts[b.id] ?? "").trim() || null,
                              })
                            }
                            className="min-h-[44px] rounded-md border border-black/10 px-2.5 text-[11px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/10 dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit || pendingBrandIds.has(b.id) || !(brandImageDrafts[b.id] ?? "").trim()}
                            onClick={() =>
                              patchBrand(b.id, {
                                image: null,
                              })
                            }
                            className="min-h-[44px] rounded-md border border-black/10 px-2.5 text-[11px] font-medium text-[#666] transition-colors hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/10 dark:text-[#aaa] dark:hover:bg-white/[0.06]"
                          >
                            Supprimer le visuel
                          </button>
                        </div>
                        {b.catalogMode === "COMPLETE" && !(brandImageDrafts[b.id] ?? "").trim() && (
                          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                            Image requise en gamme complète.
                          </p>
                        )}
                      </div>
                    </div>
                      </div>
                    )}
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
      {canEdit && tab === "brands" && !showBrandCreateForm && (
        <button
          type="button"
          onClick={() => setShowBrandCreateForm(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-600 hover:shadow-xl active:scale-95 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label="Nouvelle marque"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={hardDelete}
        />
      )}
      {brandDeleteTarget && (
        <ConfirmBrandDeleteModal
          target={brandDeleteTarget}
          onCancel={() => setBrandDeleteTarget(null)}
          onConfirm={deleteBrand}
        />
      )}
    </div>
  );
}

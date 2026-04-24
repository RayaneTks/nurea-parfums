"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Plus, SunMoon, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { PerfumeList } from "./PerfumeList";
import { BrandList } from "./BrandList";
import { FeaturedList } from "./FeaturedList";
import { AdminToast, ToastType } from "./ui/AdminToast";
import { AdminButton } from "./ui/AdminButton";

type SessionUser = { username: string; role: string };

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  catalogMode: "CURATED" | "COMPLETE";
  status: "PUBLISHED" | "DRAFT";
  image: string | null;
  imageLight: string | null;
  _count: { perfumes: number };
};

type PerfumeRow = {
  id: number;
  image: string;
  imageLight: string | null;
  name: string;
  status: string;
  isFeatured?: boolean;
  brand: { id: string; name: string; image: string | null; catalogMode: "CURATED" | "COMPLETE"; status: "PUBLISHED" | "DRAFT" };
};

type Tab = "perfumes" | "brands" | "featured";

function ConfirmDeleteModal({
  target,
  onCancel,
  onConfirm,
}: {
  target: { id: number | string; name: string; count?: number };
  onCancel: () => void;
  onConfirm: (id: any) => void;
}) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-[rgba(26,18,21,0.45)] backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full border border-[var(--admin-border)] border-b-0 bg-[var(--admin-surface)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg sm:max-w-sm sm:border-b">
        <div className="mx-auto mb-6 h-1 w-10 bg-[var(--admin-border)] sm:hidden" />
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-[rgba(163,48,48,0.25)] bg-[rgba(163,48,48,0.08)]">
          <AlertCircle className="h-6 w-6 text-[var(--admin-danger)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--admin-text)]">Confirmer la suppression</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--admin-muted)]">
          Voulez-vous vraiment supprimer <span className="font-semibold text-[var(--admin-text)]">«&nbsp;{target.name}&nbsp;»</span> ?
          {target.count !== undefined && target.count > 0 && (
            <span className="mt-2 block border border-[rgba(163,48,48,0.25)] bg-[rgba(163,48,48,0.06)] p-3 text-xs text-[var(--admin-danger)]">
              Attention : cela supprimera également {target.count} parfum{target.count > 1 ? "s" : ""} lié{target.count > 1 ? "s" : ""}.
            </span>
          )}
          <span className="mt-2 block italic">Cette action est irréversible.</span>
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <AdminButton variant="danger" onClick={() => onConfirm(target.id)}>
            Supprimer définitivement
          </AdminButton>
          <AdminButton variant="ghost" onClick={onCancel}>
            Annuler
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function VisualizerDrawer({
  item,
  onClose,
  onUpdate,
}: {
  item: PerfumeRow | BrandRow;
  onClose: () => void;
  onUpdate: (id: string | number, data: Partial<PerfumeRow | BrandRow>) => Promise<void>;
}) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const [uploading, setUploading] = useState<"dark" | "light" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPerfume = "brand" in item;
  const imageLight = isPerfume ? (item as PerfumeRow).imageLight : (item as BrandRow).imageLight;
  const hasLight = !!imageLight;
  const mainImage = item.image || "/placeholder.svg";

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const current = e.targetTouches[0].clientY;
    const diff = current - touchStart;
    if (diff > 0) setTouchOffset(diff);
  };
  const onTouchEnd = () => {
    if (touchOffset > 100) onClose();
    setTouchStart(null);
    setTouchOffset(0);
  };

  const handleUploadClick = (targetMode: "dark" | "light") => {
    setMode(targetMode);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetMode = mode;
    setUploading(targetMode);
    
    try {
      const { uploadFile } = await import("@/lib/admin/image-utils");
      const url = await uploadFile(file);
      
      const updateData = targetMode === "dark" 
        ? { image: url } 
        : { imageLight: url };
        
      await onUpdate(item.id, updateData);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[rgba(26,18,21,0.5)] backdrop-blur-md sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92dvh] overflow-y-auto border border-[var(--admin-border)] border-b-0 bg-[var(--admin-surface)] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-w-md sm:border-b"
        style={{ transform: `translateY(${touchOffset}px)` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto mb-6 h-1 w-10 bg-[var(--admin-border)] sm:hidden" />

        <div
          className="group relative mx-auto aspect-[3/4] w-full max-w-[260px] cursor-pointer overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-elevated)] shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]"
          onClick={() => handleUploadClick(mode)}
        >
          <Image
            src={mode === "dark" ? mainImage : (imageLight || mainImage)}
            alt={item.name}
            fill
            className={`object-cover transition-all duration-700 ease-in-out ${uploading ? "opacity-40 blur-sm" : ""}`}
            sizes="(max-width: 768px) 260px, 300px"
            quality={85}
          />
          
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-[rgba(26,18,21,0.35)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${uploading ? "opacity-100" : ""}`}
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-[#FDFCFA]" />
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-[#FDFCFA]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FDFCFA]">
                  Changer l&apos;image {mode}
                </span>
              </>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#FDFCFA]/70">Aperçu</p>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#FDFCFA]">
              {mode === "dark" ? "Sombre" : "Clair"}
            </p>
          </div>
        </div>

        <input 
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept="image/*"
          onChange={handleFileChange}
        />

        <div className="mt-6 text-center">
          <h3 className="font-[family-name:var(--font-serif)] text-2xl font-normal tracking-tight text-[var(--admin-text)]">
            {item.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">{isPerfume ? (item as PerfumeRow).brand.name : "Marque"}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleUploadClick("dark")}
            className={`flex h-20 flex-col items-center justify-center gap-2 border transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
              mode === "dark"
                ? "border-[var(--admin-accent)] bg-[rgba(139,58,58,0.08)] text-[var(--admin-text)]"
                : "border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-muted)]"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Image sombre</span>
          </button>
          <button
            type="button"
            onClick={() => handleUploadClick("light")}
            className={`flex h-20 flex-col items-center justify-center gap-2 border transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
              mode === "light"
                ? "border-[var(--admin-accent)] bg-[rgba(139,58,58,0.08)] text-[var(--admin-text)]"
                : "border-[var(--admin-border)] bg-[var(--admin-elevated)] text-[var(--admin-muted)]"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{hasLight ? "Image claire" : "Ajouter clair"}</span>
          </button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {hasLight && (
            <button
              type="button"
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              className="flex min-h-[48px] items-center justify-center gap-3 border border-[var(--admin-border)] bg-[var(--admin-elevated)] text-sm font-semibold text-[var(--admin-text)] transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]"
            >
              <SunMoon className="h-5 w-5" />
              Basculer l&apos;aperçu
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[48px] items-center justify-center text-sm font-semibold text-[var(--admin-muted)] transition-colors hover:text-[var(--admin-text)]"
          >
            Fermer
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
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "perfumes";

  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: ToastType; text: string } | null>(null);

  // States for mutations
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [pendingBrandIds, setPendingBrandIds] = useState<Set<string>>(new Set());
  const [pendingFeaturedIds, setPendingFeaturedIds] = useState<Set<number>>(new Set());
  
  // Modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<{ id: string; name: string; count: number } | null>(null);
  const [previewItem, setPreviewItem] = useState<PerfumeRow | BrandRow | null>(null);

  const hasMutationInFlight = pendingDeleteIds.size > 0 || pendingStatusIds.size > 0 || pendingBrandIds.size > 0 || pendingFeaturedIds.size > 0;

  const handleSearchBrand = useCallback((brandName: string, targetTab: Tab) => {
    setSearch(brandName);
    setTab(targetTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadErr(null);
    try {
      const s = await fetch("/api/admin/session", { credentials: "include", cache: "no-store" });
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      const res = await fetch("/api/admin/catalogue", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger le catalogue.");
      
      const data = await readJsonSafe<{ brands: BrandRow[]; perfumes: PerfumeRow[] }>(res);
      
      if (data) {
        setBrands(data.brands);
        setPerfumes(data.perfumes);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canEdit = user?.role !== "VIEWER";

  // Actions Featured
  async function toggleFeatured(id: number, currentFeatured: boolean) {
    if (hasMutationInFlight) return;
    const next = !currentFeatured;

    setPendingFeaturedIds((prev) => new Set(prev).add(id));
    setPerfumes((prev) => prev.map((p) => (p.id === id ? { ...p, isFeatured: next } : p)));

    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: next }),
    });

    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Changement impossible." });
      setPerfumes((prev) => prev.map((p) => (p.id === id ? { ...p, isFeatured: currentFeatured } : p)));
    } else {
      setActionMsg({ type: "success", text: next ? "Parfum mis en avant." : "Mise en avant retirée." });
    }
    setPendingFeaturedIds((prev) => { const c = new Set(prev); c.delete(id); return c; });
  }

  // Actions Parfums

  async function toggleVisibility(id: number, currentStatus: string) {
    if (hasMutationInFlight) return;
    const row = perfumes.find((p) => p.id === id);
    if (!row) return;
    const next = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    
    if (next === "PUBLISHED" && (row.brand.catalogMode === "COMPLETE" || row.brand.status === "DRAFT")) {
      setActionMsg({ 
        type: "error", 
        text: row.brand.status === "DRAFT" ? "La marque est masquée." : "La marque est en gamme complète." 
      });
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
    } else {
      setActionMsg({ type: "success", text: next === "PUBLISHED" ? "Parfum visible." : "Parfum masqué." });
    }
    setPendingStatusIds((prev) => { const c = new Set(prev); c.delete(id); return c; });
  }

  async function hardDelete(id: number) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const deletedPerfume = perfumes.find((p) => p.id === id);
    const r = await fetch(`/api/admin/perfumes/${id}`, { method: "DELETE", credentials: "include" });
    
    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
    } else {
      setPerfumes((prev) => prev.filter((p) => p.id !== id));
      if (deletedPerfume) {
        setBrands((prev) => prev.map((b) => b.id === deletedPerfume.brand.id ? { ...b, _count: { perfumes: Math.max(0, b._count.perfumes - 1) } } : b));
      }
      setActionMsg({ type: "success", text: "Parfum supprimé." });
    }
    setDeleteTarget(null);
    setPendingDeleteIds((prev) => { const c = new Set(prev); c.delete(id); return c; });
  }

  // Actions Marques
  async function toggleBrandVisibility(id: string, currentStatus: BrandRow["status"]) {
    if (pendingBrandIds.has(id)) return;
    const nextStatus: BrandRow["status"] = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setPendingBrandIds((prev) => new Set(prev).add(id));
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)));
    
    // Update local perfumes visibility if brand hidden
    if (nextStatus === "DRAFT") {
      setPerfumes((prev) => prev.map((p) => p.brand.id === id ? { ...p, status: "DRAFT" } : p));
    }

    const r = await fetch(`/api/admin/brands/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Mise à jour impossible." });
      refresh(); // Reset full state on error
    } else {
      setActionMsg({ type: "success", text: nextStatus === "PUBLISHED" ? "Marque visible." : "Marque masquée." });
    }
    setPendingBrandIds((prev) => { const c = new Set(prev); c.delete(id); return c; });
  }

  async function deleteBrand(id: string) {
    setPendingBrandIds((prev) => new Set(prev).add(id));
    const r = await fetch(`/api/admin/brands/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
    } else {
      setBrands((prev) => prev.filter((b) => b.id !== id));
      setPerfumes((prev) => prev.filter((p) => p.brand.id !== id));
      setActionMsg({ type: "success", text: "Marque supprimée." });
    }
    setBrandDeleteTarget(null);
    setPendingBrandIds((prev) => { const c = new Set(prev); c.delete(id); return c; });
  }

  async function handleQuickUpdate(id: string | number, data: Partial<PerfumeRow | BrandRow>) {
    if (!canEdit) return;
    const isPerfume = typeof id === "number";
    const endpoint = isPerfume ? `/api/admin/perfumes/${id}` : `/api/admin/brands/${id}`;
    const method = isPerfume ? "PUT" : "PATCH"; // Based on existing API conventions

    // Optimistic UI update
    if (isPerfume) {
      const perfId = id as number;
      const perfData = data as Partial<PerfumeRow>;
      setPerfumes((prev) => prev.map((p) => (p.id === perfId ? { ...p, ...perfData } : p)));
    } else {
      const brandId = id as string;
      const brandData = data as Partial<BrandRow>;
      setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, ...brandData } : b)));
    }
    
    // Also update preview item if it's the one being modified
    if (previewItem && previewItem.id === id) {
      setPreviewItem((prev: any) => (prev ? { ...prev, ...data } : null));
    }

    try {
      const r = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!r.ok) {
        const j = await readJsonSafe<{ error?: string }>(r);
        throw new Error(j?.error ?? "Mise à jour échouée.");
      }
      
      setActionMsg({ type: "success", text: "Image mise à jour." });
    } catch (err) {
      setActionMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur" });
      refresh(); // Revert to server state
    }
  }

  return (
    <div className="min-h-0 selection:bg-[rgba(139,58,58,0.2)]">
      <main className="mx-auto max-w-4xl px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
        <DashboardHeader
          perfumeCount={perfumes.length}
          brandCount={brands.length}
          activeTab={tab}
          onTabChange={setTab}
          canEdit={canEdit}
          isLoading={isLoading}
        />

        {loadErr && (
          <div className="mt-4 flex items-start gap-3 border border-[rgba(163,48,48,0.3)] bg-[rgba(163,48,48,0.06)] p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--admin-danger)]" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--admin-danger)]">Erreur de chargement</p>
              <p className="mt-0.5 text-[13px] text-[var(--admin-muted)]">{loadErr}</p>
              <button
                type="button"
                onClick={refresh}
                className="mt-3 text-[12px] font-bold uppercase tracking-wider text-[var(--admin-danger)] underline decoration-[var(--admin-border)] underline-offset-4 transition-colors hover:opacity-90"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 animate-pulse border border-[var(--admin-border)] bg-[var(--admin-elevated)]" />
              ))}
            </div>
          ) : tab === "featured" ? (
            <FeaturedList
              perfumes={perfumes}
              canEdit={canEdit}
              onToggleFeatured={toggleFeatured}
              pendingFeaturedIds={pendingFeaturedIds}
              search={search}
              onSearchChange={setSearch}
            />
          ) : tab === "perfumes" ? (
            <PerfumeList
              perfumes={perfumes}
              canEdit={canEdit}
              onToggleVisibility={toggleVisibility}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onGoToBrand={(name) => handleSearchBrand(name, "brands")}
              onPreview={setPreviewItem}
              pendingStatusIds={pendingStatusIds}
              pendingDeleteIds={pendingDeleteIds}
              hasMutationInFlight={hasMutationInFlight}
              search={search}
              onSearchChange={setSearch}
            />
          ) : (
            <BrandList
              brands={brands}
              canEdit={canEdit}
              onToggleVisibility={toggleBrandVisibility}
              onDelete={(id, name, count) => setBrandDeleteTarget({ id, name, count })}
              onFilterPerfumes={(name) => handleSearchBrand(name, "perfumes")}
              onPreview={setPreviewItem}
              pendingBrandIds={pendingBrandIds}
              hasMutationInFlight={hasMutationInFlight}
              search={search}
              onSearchChange={setSearch}
            />
          )}
        </div>
      </main>

      {/* Visualizer */}
      {previewItem && (
        <VisualizerDrawer
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onUpdate={handleQuickUpdate}
        />
      )}

      {/* Mobile FAB */}
      {canEdit && (
        <Link
          href={tab === "perfumes" ? "/admin/perfumes/new" : "/admin/brands/new"}
          className="fixed right-4 z-[55] flex h-14 w-14 items-center justify-center border border-[var(--admin-border)] bg-[var(--admin-accent-solid)] text-[#FDFCFA] shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)]"
          style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
          aria-label={tab === "perfumes" ? "Ajouter un parfum" : "Ajouter une marque"}
        >
          <Plus className="h-7 w-7" aria-hidden />
        </Link>
      )}

      {/* Toasts */}
      {actionMsg && (
        <AdminToast
          type={actionMsg.type}
          message={actionMsg.text}
          onClose={() => setActionMsg(null)}
        />
      )}

      {/* Modals */}
      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={hardDelete}
        />
      )}
      {brandDeleteTarget && (
        <ConfirmDeleteModal
          target={brandDeleteTarget}
          onCancel={() => setBrandDeleteTarget(null)}
          onConfirm={deleteBrand}
        />
      )}
    </div>
  );
}

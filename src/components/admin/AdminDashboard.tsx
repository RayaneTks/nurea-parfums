"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Plus, SunMoon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AdminNav } from "./AdminNav";
import { DashboardHeader } from "./DashboardHeader";
import { PerfumeList } from "./PerfumeList";
import { BrandList } from "./BrandList";
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
  _count: { perfumes: number };
};

type PerfumeRow = {
  id: number;
  image: string;
  imageLight: string | null;
  name: string;
  status: string;
  brand: { id: string; name: string; image: string | null; catalogMode: "CURATED" | "COMPLETE"; status: "PUBLISHED" | "DRAFT" };
};

type Tab = "perfumes" | "brands";

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
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full sm:max-w-sm rounded-t-[32px] sm:rounded-3xl bg-zinc-900 border-t sm:border border-zinc-800 p-6 sm:p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-zinc-800 mb-6 sm:hidden" />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-zinc-100">Confirmer la suppression</h3>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          Voulez-vous vraiment supprimer <span className="text-zinc-200 font-semibold">«&nbsp;{target.name}&nbsp;»</span> ?
          {target.count !== undefined && target.count > 0 && (
            <span className="block mt-2 p-3 bg-red-500/5 rounded-xl border border-red-500/10 text-red-400/80 text-xs">
              Attention : cela supprimera également {target.count} parfum{target.count > 1 ? "s" : ""} lié{target.count > 1 ? "s" : ""}.
            </span>
          )}
          <span className="block mt-2 italic">Cette action est irréversible.</span>
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
}: {
  item: PerfumeRow | BrandRow;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchOffset, setTouchOffset] = useState(0);

  const isPerfume = "brand" in item;
  const imageLight = isPerfume ? (item as PerfumeRow).imageLight : null;
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

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="w-full sm:max-w-md rounded-t-[40px] sm:rounded-[32px] bg-zinc-900 border-t sm:border border-zinc-800 p-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 ease-out"
        style={{ transform: `translateY(${touchOffset}px)` }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto w-12 h-1.5 rounded-full bg-zinc-800 mb-8 sm:hidden" />
        
        <div className="relative aspect-[3/4] w-full max-w-[260px] mx-auto rounded-[32px] overflow-hidden bg-zinc-950 shadow-2xl border border-zinc-800">
          <Image
            src={mode === "dark" ? mainImage : (imageLight || mainImage)}
            alt={item.name}
            fill
            className="object-cover transition-all duration-700 ease-in-out"
            sizes="300px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Mode actuel</p>
            <p className="text-sm font-bold text-white uppercase tracking-widest">{mode === "dark" ? "Sombre (Dark)" : "Clair (Light)"}</p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <h3 className="text-2xl font-bold text-zinc-100 tracking-tight">{item.name}</h3>
          <p className="text-sm text-zinc-500 mt-1">{isPerfume ? (item as PerfumeRow).brand.name : "Marque"}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {hasLight && (
            <button
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-zinc-100 text-zinc-900 font-bold active:scale-95 transition-all shadow-xl"
            >
              <SunMoon className="h-5 w-5" />
              Basculer le mode (Clair / Sombre)
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-14 items-center justify-center rounded-2xl bg-zinc-800/50 text-zinc-400 font-semibold active:scale-95 transition-all"
          >
            Fermer l'aperçu
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
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("perfumes");
  const [actionMsg, setActionMsg] = useState<{ type: ToastType; text: string } | null>(null);

  // States for mutations
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [pendingBrandIds, setPendingBrandIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<{ id: string; name: string; count: number } | null>(null);
  const [previewItem, setPreviewItem] = useState<PerfumeRow | BrandRow | null>(null);

  const hasMutationInFlight = pendingDeleteIds.size > 0 || pendingStatusIds.size > 0 || pendingBrandIds.size > 0;

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30">
      <AdminNav />

      <main className="mx-auto max-w-4xl px-5 pt-8 pb-32">
        <DashboardHeader
          perfumeCount={perfumes.length}
          brandCount={brands.length}
          activeTab={tab}
          onTabChange={setTab}
          canEdit={canEdit}
          isLoading={isLoading}
        />

        {loadErr && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-500">Erreur de chargement</p>
              <p className="text-[13px] text-red-400/80 mt-0.5">{loadErr}</p>
              <button onClick={refresh} className="mt-3 text-[12px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors">
                Réessayer
              </button>
            </div>
          </div>
        )}

        <div className="mt-8">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl border border-zinc-800/50" />
              ))}
            </div>
          ) : tab === "perfumes" ? (
            <PerfumeList
              perfumes={perfumes}
              canEdit={canEdit}
              onToggleVisibility={toggleVisibility}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onGoToBrand={(name) => { setTab("brands"); /* Search will be handled by list internal state or lifted up if needed */ }}
              onPreview={setPreviewItem}
              pendingStatusIds={pendingStatusIds}
              pendingDeleteIds={pendingDeleteIds}
              hasMutationInFlight={hasMutationInFlight}
            />
          ) : (
            <BrandList
              brands={brands}
              canEdit={canEdit}
              onToggleVisibility={toggleBrandVisibility}
              onDelete={(id, name, count) => setBrandDeleteTarget({ id, name, count })}
              onFilterPerfumes={(name) => { setTab("perfumes"); /* Lift up search if cross-tab search is needed */ }}
              onPreview={setPreviewItem}
              pendingBrandIds={pendingBrandIds}
              hasMutationInFlight={hasMutationInFlight}
            />
          )}
        </div>
      </main>

      {/* Visualizer */}
      {previewItem && (
        <VisualizerDrawer
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* Mobile FAB */}
      {canEdit && (
        <Link 
          href={tab === "perfumes" ? "/admin/perfumes/new" : "/admin/brands/new"}
          className="fixed bottom-8 right-6 z-50 md:hidden animate-in fade-in slide-in-from-bottom-6 duration-500"
        >
          <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)] transition-all duration-300 active:scale-90 hover:bg-blue-500">
            <Plus className="h-7 w-7" />
          </button>
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

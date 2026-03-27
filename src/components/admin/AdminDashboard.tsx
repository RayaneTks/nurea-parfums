"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";
import Link from "next/link";
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl animate-in zoom-in-95 duration-300">
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
  const [tab, setTab] = useState<Tab>("perfumes");
  const [actionMsg, setActionMsg] = useState<{ type: ToastType; text: string } | null>(null);

  // States for mutations
  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [pendingBrandIds, setPendingBrandIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<{ id: string; name: string; count: number } | null>(null);

  const hasMutationInFlight = pendingDeleteIds.size > 0 || pendingStatusIds.size > 0 || pendingBrandIds.size > 0;

  const refresh = useCallback(async () => {
    setLoadErr(null);
    try {
      const s = await fetch("/api/admin/session", { credentials: "include", cache: "no-store" });
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      const [bRes, pRes] = await Promise.all([
        fetch("/api/admin/brands", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/perfumes", { credentials: "include", cache: "no-store" })
      ]);

      if (bRes.ok) {
        const bj = await readJsonSafe<{ brands: BrandRow[] }>(bRes);
        setBrands(bj?.brands ?? []);
      }
      if (pRes.ok) {
        const pj = await readJsonSafe<{ perfumes: PerfumeRow[] }>(pRes);
        setPerfumes(pj?.perfumes ?? []);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
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
          {tab === "perfumes" ? (
            <PerfumeList
              perfumes={perfumes}
              canEdit={canEdit}
              onToggleVisibility={toggleVisibility}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onGoToBrand={(name) => { setTab("brands"); /* Search will be handled by list internal state or lifted up if needed */ }}
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
              pendingBrandIds={pendingBrandIds}
              hasMutationInFlight={hasMutationInFlight}
            />
          )}
        </div>
      </main>

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

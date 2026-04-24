"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { AlertCircle, Plus, SunMoon, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DashboardHeader } from "./DashboardHeader";
import { PerfumeList } from "./PerfumeList";
import { BrandList } from "./BrandList";
import { FeaturedList } from "./FeaturedList";
import { AdminToast, type ToastType } from "./ui/AdminToast";
import { AdminButton } from "./ui/AdminButton";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { FAB } from "./ui/FAB";
import { SectionCard } from "./ui/SectionCard";
import { cn } from "@/lib/utils";

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
  brand: {
    id: string;
    name: string;
    image: string | null;
    catalogMode: "CURATED" | "COMPLETE";
    status: "PUBLISHED" | "DRAFT";
  };
};

type Tab = "perfumes" | "brands" | "featured";

type CatalogueCache = {
  user: SessionUser | null;
  brands: BrandRow[];
  perfumes: PerfumeRow[];
};

let catalogueCache: CatalogueCache | null = null;

async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function VisualizerSheet({
  item,
  onClose,
  onUpdate,
  canEdit,
}: {
  item: PerfumeRow | BrandRow;
  onClose: () => void;
  onUpdate: (id: string | number, data: Partial<PerfumeRow | BrandRow>) => Promise<void>;
  canEdit: boolean;
}) {
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [uploading, setUploading] = useState<"dark" | "light" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPerfume = "brand" in item;
  const imageLight = isPerfume ? (item as PerfumeRow).imageLight : (item as BrandRow).imageLight;
  const hasLight = !!imageLight;
  const mainImage = item.image || "/placeholder.svg";

  const triggerUpload = (targetMode: "dark" | "light") => {
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
      const updateData = targetMode === "dark" ? { image: url } : { imageLight: url };
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
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-[var(--admin-overlay)] backdrop-blur-md animate-in fade-in duration-200 ease-out-expo"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu ${item.name}`}
    >
      <div
        className="w-full sm:max-w-md bg-admin-surface border-t sm:border border-admin-border p-7 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300 ease-out-expo"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="mx-auto block mb-6 h-1.5 w-12 rounded-full bg-admin-border sm:hidden tap-scale"
        />

        <div
          className={cn(
            "group relative aspect-[3/4] w-full max-w-[240px] mx-auto rounded-xl overflow-hidden bg-admin-bg border border-admin-border",
            canEdit && "cursor-pointer tap-scale",
          )}
          onClick={() => canEdit && triggerUpload(mode)}
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
        >
          <Image
            src={mode === "dark" ? mainImage : imageLight || mainImage}
            alt={item.name}
            fill
            className={cn(
              "object-cover transition-[opacity,filter] duration-500",
              uploading && "opacity-40 blur-sm",
            )}
            sizes="240px"
            quality={85}
          />

          {canEdit ? (
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center bg-[var(--admin-overlay)] opacity-0 transition-opacity duration-200",
                "[@media(hover:hover)]:group-hover:opacity-100 group-focus-visible:opacity-100",
                uploading && "opacity-100",
              )}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-admin-text" aria-hidden />
              ) : (
                <>
                  <Upload className="h-7 w-7 text-admin-text mb-2" aria-hidden />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-admin-text">
                    Changer {mode === "dark" ? "Dark" : "Light"}
                  </span>
                </>
              )}
            </div>
          ) : null}

          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <p className="text-[9px] uppercase tracking-wider text-admin-text/60 mb-0.5">
              Aperçu
            </p>
            <p className="font-serif text-[14px] tracking-[-0.01em] text-admin-text">
              {mode === "dark" ? "Sombre" : "Clair"}
            </p>
          </div>
        </div>

        {canEdit ? (
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={handleFileChange}
          />
        ) : null}

        <div className="mt-6 text-center">
          <h3 className="font-serif text-[22px] leading-tight tracking-[-0.01em] text-admin-text">
            {item.name}
          </h3>
          <p className="mt-1 text-[12px] uppercase tracking-wider text-admin-subtle">
            {isPerfume ? (item as PerfumeRow).brand.name : "Marque"}
          </p>
        </div>

        {canEdit ? (
          <div className="mt-6 grid grid-cols-2 gap-2">
            <AdminButton
              variant={mode === "dark" ? "primary" : "secondary"}
              size="md"
              leftIcon={Upload}
              onClick={() => triggerUpload("dark")}
            >
              Dark
            </AdminButton>
            <AdminButton
              variant={mode === "light" ? "primary" : "secondary"}
              size="md"
              leftIcon={Upload}
              onClick={() => triggerUpload("light")}
            >
              {hasLight ? "Light" : "Ajouter Light"}
            </AdminButton>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          {hasLight ? (
            <AdminButton
              variant="ghost"
              size="lg"
              leftIcon={SunMoon}
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            >
              Basculer l&apos;aperçu
            </AdminButton>
          ) : null}
          <AdminButton variant="ghost" size="lg" onClick={onClose}>
            Fermer
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  initialData?: CatalogueCache;
}

export function AdminDashboard({ initialData }: AdminDashboardProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("perfumes");
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: ToastType; text: string } | null>(null);

  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [pendingBrandIds, setPendingBrandIds] = useState<Set<string>>(new Set());
  const [pendingFeaturedIds, setPendingFeaturedIds] = useState<Set<number>>(new Set());

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [brandDeleteTarget, setBrandDeleteTarget] = useState<{
    id: string;
    name: string;
    count: number;
  } | null>(null);
  const [previewItem, setPreviewItem] = useState<PerfumeRow | BrandRow | null>(null);

  const hasMutationInFlight =
    pendingDeleteIds.size > 0 ||
    pendingStatusIds.size > 0 ||
    pendingBrandIds.size > 0 ||
    pendingFeaturedIds.size > 0;

  const handleSearchBrand = useCallback((brandName: string, targetTab: Tab) => {
    setSearch(brandName);
    setTab(targetTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refresh = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }
    setLoadErr(null);
    try {
      const res = await fetch("/api/admin/catalogue", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger le catalogue.");
      const data = await readJsonSafe<{ user?: SessionUser; brands: BrandRow[]; perfumes: PerfumeRow[] }>(res);
      const nextUser = data?.user ?? null;
      const nextBrands = data?.brands ?? [];
      const nextPerfumes = data?.perfumes ?? [];

      setUser(nextUser);
      setBrands(nextBrands);
      setPerfumes(nextPerfumes);
      catalogueCache = {
        user: nextUser,
        brands: nextBrands,
        perfumes: nextPerfumes,
      };
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setUser(initialData.user);
      setBrands(initialData.brands);
      setPerfumes(initialData.perfumes);
      setIsLoading(false);
      catalogueCache = initialData;
      void refresh(true);
      return;
    }
    if (catalogueCache) {
      setUser(catalogueCache.user);
      setBrands(catalogueCache.brands);
      setPerfumes(catalogueCache.perfumes);
      setIsLoading(false);
      void refresh(true);
      return;
    }
    void refresh();
  }, [initialData, refresh]);

  const handleTabChange = useCallback((next: Tab) => {
    if (next === tab) return;
    setIsTabTransitioning(true);
    window.setTimeout(() => {
      setTab(next);
      window.requestAnimationFrame(() => {
        setIsTabTransitioning(false);
      });
    }, 90);
  }, [tab]);

  const canEdit = user?.role !== "VIEWER";

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
      setPerfumes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFeatured: currentFeatured } : p)),
      );
    } else {
      setActionMsg({
        type: "success",
        text: next ? "Parfum mis en avant." : "Mise en avant retirée.",
      });
    }
    setPendingFeaturedIds((prev) => {
      const c = new Set(prev);
      c.delete(id);
      return c;
    });
  }

  async function toggleVisibility(id: number, currentStatus: string) {
    if (hasMutationInFlight) return;
    const row = perfumes.find((p) => p.id === id);
    if (!row) return;
    const next = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    if (next === "PUBLISHED" && (row.brand.catalogMode === "COMPLETE" || row.brand.status === "DRAFT")) {
      setActionMsg({
        type: "error",
        text:
          row.brand.status === "DRAFT"
            ? "La marque est masquée."
            : "La marque est en gamme complète.",
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
      setActionMsg({
        type: "success",
        text: next === "PUBLISHED" ? "Parfum visible." : "Parfum masqué.",
      });
    }
    setPendingStatusIds((prev) => {
      const c = new Set(prev);
      c.delete(id);
      return c;
    });
  }

  async function hardDelete(id: number) {
    setPendingDeleteIds((prev) => new Set(prev).add(id));
    const deletedPerfume = perfumes.find((p) => p.id === id);
    const r = await fetch(`/api/admin/perfumes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
    } else {
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
      setActionMsg({ type: "success", text: "Parfum supprimé." });
    }
    setDeleteTarget(null);
    setPendingDeleteIds((prev) => {
      const c = new Set(prev);
      c.delete(id);
      return c;
    });
  }

  async function toggleBrandVisibility(id: string, currentStatus: BrandRow["status"]) {
    if (pendingBrandIds.has(id)) return;
    const nextStatus: BrandRow["status"] = currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setPendingBrandIds((prev) => new Set(prev).add(id));
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, status: nextStatus } : b)));

    if (nextStatus === "DRAFT") {
      setPerfumes((prev) =>
        prev.map((p) => (p.brand.id === id ? { ...p, status: "DRAFT" } : p)),
      );
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
      refresh();
    } else {
      setActionMsg({
        type: "success",
        text: nextStatus === "PUBLISHED" ? "Marque visible." : "Marque masquée.",
      });
    }
    setPendingBrandIds((prev) => {
      const c = new Set(prev);
      c.delete(id);
      return c;
    });
  }

  async function deleteBrand(id: string) {
    setPendingBrandIds((prev) => new Set(prev).add(id));
    const r = await fetch(`/api/admin/brands/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      const j = await readJsonSafe<{ error?: string }>(r);
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
    } else {
      setBrands((prev) => prev.filter((b) => b.id !== id));
      setPerfumes((prev) => prev.filter((p) => p.brand.id !== id));
      setActionMsg({ type: "success", text: "Marque supprimée." });
    }
    setBrandDeleteTarget(null);
    setPendingBrandIds((prev) => {
      const c = new Set(prev);
      c.delete(id);
      return c;
    });
  }

  async function handleQuickUpdate(id: string | number, data: Partial<PerfumeRow | BrandRow>) {
    if (!canEdit) return;
    const isPerfume = typeof id === "number";
    const endpoint = isPerfume ? `/api/admin/perfumes/${id}` : `/api/admin/brands/${id}`;
    const method = isPerfume ? "PUT" : "PATCH";

    if (isPerfume) {
      const perfId = id as number;
      const perfData = data as Partial<PerfumeRow>;
      setPerfumes((prev) => prev.map((p) => (p.id === perfId ? { ...p, ...perfData } : p)));
    } else {
      const brandId = id as string;
      const brandData = data as Partial<BrandRow>;
      setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, ...brandData } : b)));
    }

    if (previewItem && previewItem.id === id) {
      setPreviewItem((prev) => (prev ? ({ ...prev, ...data } as PerfumeRow | BrandRow) : null));
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
      refresh();
    }
  }

  const fabHref =
    tab === "perfumes"
      ? "/admin/perfumes/new"
      : tab === "brands"
        ? "/admin/brands/new"
        : null;

  return (
    <>
      <DashboardHeader
        perfumeCount={perfumes.length}
        brandCount={brands.length}
        activeTab={tab}
        onTabChange={handleTabChange}
        canEdit={canEdit}
        isLoading={isLoading}
      />

      <main
        id="main-content"
        className={cn(
          "flex-1 px-5 pt-5 transition-opacity duration-150 ease-out",
          isTabTransitioning ? "opacity-0" : "opacity-100",
        )}
      >
        {loadErr ? (
          <SectionCard className="flex items-start gap-3 p-4 mb-5 border-[var(--admin-danger-border)] bg-[var(--admin-danger-subtle)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-admin-danger" aria-hidden />
            <div className="flex-1">
              <p className="text-[13px] font-medium text-admin-danger">Erreur de chargement</p>
              <p className="text-[12px] text-admin-muted mt-0.5">{loadErr}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-2 text-[11px] uppercase tracking-wider text-admin-accent font-medium [@media(hover:hover)]:hover:text-admin-accent-hover"
              >
                Réessayer
              </button>
            </div>
          </SectionCard>
        ) : null}

        {isLoading ? (
          <div className="space-y-3 pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-xl border border-admin-border admin-skeleton"
              />
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
      </main>

      {previewItem ? (
        <VisualizerSheet
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onUpdate={handleQuickUpdate}
          canEdit={canEdit}
        />
      ) : null}

      {canEdit && fabHref ? (
        <FAB
          href={fabHref}
          icon={Plus}
          label={tab === "perfumes" ? "Ajouter un parfum" : "Ajouter une marque"}
        />
      ) : null}

      {actionMsg ? (
        <AdminToast
          type={actionMsg.type}
          message={actionMsg.text}
          onClose={() => setActionMsg(null)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Supprimer ce parfum ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.name} » sera définitivement supprimé du catalogue.`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={deleteTarget ? pendingDeleteIds.has(deleteTarget.id) : false}
        onConfirm={() => deleteTarget && hardDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={brandDeleteTarget !== null}
        title="Supprimer cette marque ?"
        description={
          brandDeleteTarget
            ? `« ${brandDeleteTarget.name} » sera supprimée${brandDeleteTarget.count > 0 ? ` avec ses ${brandDeleteTarget.count} parfum${brandDeleteTarget.count > 1 ? "s" : ""} associé${brandDeleteTarget.count > 1 ? "s" : ""}` : ""}.`
            : undefined
        }
        confirmLabel="Supprimer définitivement"
        destructive
        isLoading={brandDeleteTarget ? pendingBrandIds.has(brandDeleteTarget.id) : false}
        onConfirm={() => brandDeleteTarget && deleteBrand(brandDeleteTarget.id)}
        onCancel={() => setBrandDeleteTarget(null)}
      />
    </>
  );
}

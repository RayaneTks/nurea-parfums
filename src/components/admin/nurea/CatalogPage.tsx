"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Plus,
  ChevronRight,
  Eye,
  LayoutGrid,
  Search,
  Star,
  StarOff,
  RefreshCw,
} from "lucide-react";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { FAB } from "../ui/FAB";
import { SectionCard } from "../ui/SectionCard";
import { cn } from "@/lib/utils";
import type {
  AdminBrandRow,
  AdminCatalogueCache,
  AdminCataloguePayload,
  AdminPerfumeRow,
  AdminSessionUser,
} from "@/lib/admin/catalogue-types";
import { readJsonSafe } from "@/lib/admin/http";
import { nureaAdminThumbLoader } from "@/lib/image/cappedImageLoader";

type SessionUser = AdminSessionUser;
type BrandRow = AdminBrandRow;
type PerfumeRow = AdminPerfumeRow;
type Tab = "perfumes" | "brands" | "featured";
type VisFilter = "all" | "PUBLISHED" | "DRAFT";
/** Filtre liste marques : mode catalogue et/ou visibilité. */
type BrandListFilter = "all" | "complete" | "curated" | "PUBLISHED" | "DRAFT";
type CatalogueCache = AdminCatalogueCache;

let catalogueCache: CatalogueCache | null = null;

function BrandListThumb({
  name,
  imageLight,
  image,
}: {
  name: string;
  imageLight: string | null;
  image: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const src = (imageLight || image || "").trim();
  if (!src || broken) {
    return (
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--admin-text)_92%,white)] text-lg font-bold text-white"
        aria-hidden
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-admin-border bg-admin-surface">
      <Image
        loader={nureaAdminThumbLoader}
        src={src}
        alt={`Visuel marque ${name}`}
        width={48}
        height={48}
        sizes="48px"
        quality={60}
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

interface NureaCatalogPageProps {
  initialData?: CatalogueCache;
}

function parseVisFilter(v: string | null): VisFilter | null {
  if (v === "all" || v === "PUBLISHED" || v === "DRAFT") return v;
  return null;
}

function parseBrandListFilter(v: string | null): BrandListFilter | null {
  if (v === "all" || v === "complete" || v === "curated" || v === "PUBLISHED" || v === "DRAFT") {
    return v;
  }
  return null;
}

export function NureaCatalogPage({ initialData }: NureaCatalogPageProps) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/catalogue";
  const urlHydrated = useRef(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  const [tab, setTab] = useState<Tab>("perfumes");
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);
  const [search, setSearch] = useState("");
  const [perfumeVisFilter, setPerfumeVisFilter] = useState<VisFilter>("all");
  const [brandListFilter, setBrandListFilter] = useState<BrandListFilter>("all");
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
  const featuredCount = useMemo(
    () => perfumes.filter((p) => p.isFeatured).length,
    [perfumes],
  );

  const perfumesMatchingSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return perfumes;
    return perfumes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.brand.name.toLowerCase().includes(q),
    );
  }, [perfumes, search]);

  const filteredPerfumes = useMemo(() => {
    if (perfumeVisFilter === "all") return perfumesMatchingSearch;
    return perfumesMatchingSearch.filter((p) => p.status === perfumeVisFilter);
  }, [perfumesMatchingSearch, perfumeVisFilter]);

  const brandMatchingSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  const filteredBrands = useMemo(() => {
    if (brandListFilter === "all") return brandMatchingSearch;
    if (brandListFilter === "complete") {
      return brandMatchingSearch.filter((b) => b.catalogMode === "COMPLETE");
    }
    if (brandListFilter === "curated") {
      return brandMatchingSearch.filter((b) => b.catalogMode === "CURATED");
    }
    if (brandListFilter === "PUBLISHED") {
      return brandMatchingSearch.filter((b) => b.status === "PUBLISHED");
    }
    return brandMatchingSearch.filter((b) => b.status === "DRAFT");
  }, [brandMatchingSearch, brandListFilter]);

  const perfumeVisCounts = useMemo(
    () => ({
      all: perfumesMatchingSearch.length,
      vis: perfumesMatchingSearch.filter((p) => p.status === "PUBLISHED").length,
      hid: perfumesMatchingSearch.filter((p) => p.status === "DRAFT").length,
    }),
    [perfumesMatchingSearch],
  );

  const brandListCounts = useMemo(() => {
    const s = brandMatchingSearch;
    return {
      all: s.length,
      complete: s.filter((b) => b.catalogMode === "COMPLETE").length,
      curated: s.filter((b) => b.catalogMode === "CURATED").length,
      vis: s.filter((b) => b.status === "PUBLISHED").length,
      hid: s.filter((b) => b.status === "DRAFT").length,
    };
  }, [brandMatchingSearch]);

  const featuredOnes = useMemo(
    () => filteredPerfumes.filter((p) => p.isFeatured),
    [filteredPerfumes],
  );

  const othersForFeatured = useMemo(
    () => filteredPerfumes.filter((p) => !p.isFeatured),
    [filteredPerfumes],
  );

  /** Lecture initiale : ?tab=&q=&pf=&bf= */
  useEffect(() => {
    if (urlHydrated.current || typeof window === "undefined") return;
    urlHydrated.current = true;
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t === "brands" || t === "perfumes" || t === "featured") {
      setTab(t);
    }
    const q = p.get("q");
    if (q) {
      setSearch(q);
    }
    const pf = parseVisFilter(p.get("pf"));
    if (pf) {
      setPerfumeVisFilter(pf);
    }
    const bf = parseBrandListFilter(p.get("bf"));
    if (bf) {
      setBrandListFilter(bf);
    }
  }, []);

  const replaceCatalogueUrl = useCallback(
    (overrides?: {
      nextTab?: Tab;
      nextSearch?: string;
      nextPf?: VisFilter;
      nextBf?: BrandListFilter;
    }) => {
      const t = overrides?.nextTab ?? tab;
      const q = overrides?.nextSearch ?? search;
      const pf = overrides?.nextPf ?? perfumeVisFilter;
      const bf = overrides?.nextBf ?? brandListFilter;
      const p = new URLSearchParams();
      p.set("tab", t);
      const qt = q.trim();
      if (qt.length > 0) {
        p.set("q", qt);
      }
      if (pf !== "all") {
        p.set("pf", pf);
      }
      if (bf !== "all") {
        p.set("bf", bf);
      }
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [tab, search, perfumeVisFilter, brandListFilter, pathname, router],
  );

  const goToBrandInCatalog = useCallback(
    (brandName: string) => {
      const encoded = brandName.trim();
      setSearch(encoded);
      setTab("brands");
      setBrandListFilter("all");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => {
        replaceCatalogueUrl({ nextTab: "brands", nextSearch: encoded, nextBf: "all" });
      }, 0);
    },
    [replaceCatalogueUrl],
  );

  const searchUrlDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchFieldChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchUrlDebounce.current) {
        clearTimeout(searchUrlDebounce.current);
      }
      searchUrlDebounce.current = setTimeout(() => {
        replaceCatalogueUrl({ nextSearch: value });
      }, 400);
    },
    [replaceCatalogueUrl],
  );

  const refresh = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }
    setLoadErr(null);
    try {
      const res = await fetch("/api/admin/catalogue", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Impossible de charger le catalogue.");
      const data = await readJsonSafe<AdminCataloguePayload>(res);
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

  const handleRefreshCatalog = useCallback(async () => {
    setIsRefreshingCatalog(true);
    try {
      await refresh(true);
    } finally {
      setIsRefreshingCatalog(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (initialData) {
      setUser(initialData.user);
      setBrands(initialData.brands);
      setPerfumes(initialData.perfumes);
      setIsLoading(false);
      catalogueCache = initialData;
      /* Données déjà fournies par le SSR : évite un second GET /api/admin/catalogue au montage. */
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

  const handleTabChange = useCallback(
    (next: Tab) => {
      if (next === tab) return;
      setIsTabTransitioning(true);
      window.setTimeout(() => {
        setTab(next);
        replaceCatalogueUrl({ nextTab: next });
        window.requestAnimationFrame(() => {
          setIsTabTransitioning(false);
        });
      }, 200);
    },
    [tab, replaceCatalogueUrl],
  );

  const canEdit = user?.role !== "VIEWER";

  async function toggleFeatured(id: number, currentFeatured: boolean) {
    if (pendingFeaturedIds.has(id)) return;
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
    if (pendingStatusIds.has(id)) return;
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

  const fabHref =
    tab === "perfumes"
      ? "/admin/perfumes/new"
      : tab === "brands"
        ? "/admin/brands/new"
        : null;

  return (
    <>
      <main
        id="main-content"
        className={cn(
          "admin-tab-panel-fade min-w-0 flex-1 overscroll-y-contain",
          isTabTransitioning ? "opacity-0" : "opacity-100",
        )}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={reduceMotion ? false : { opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="px-5 pt-2"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 pr-1">
              <h2 className="text-3xl font-bold tracking-tight text-admin-text">Catalogue</h2>
              <p className="mt-0.5 text-sm tabular-nums text-admin-subtle">
                {isLoading ? "…" : `${perfumes.length} · ${brands.length}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshCatalog()}
              disabled={isLoading || isRefreshingCatalog}
              className="ios-transition inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-0 text-neutral-600 shadow-sm tap-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 focus-visible:ring-offset-2 focus-visible:ring-offset-ios-bg disabled:opacity-50"
              aria-label="Actualiser le catalogue"
            >
              <RefreshCw
                className={cn("h-[18px] w-[18px]", isRefreshingCatalog && "animate-spin")}
              />
            </button>
          </div>

          <div className="mb-6 flex gap-1 rounded-2xl bg-neutral-200/50 p-1">
            {(
              [
                { id: "perfumes" as const, label: "Parfums" },
                { id: "brands" as const, label: "Marques" },
                { id: "featured" as const, label: "Mise en avant" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "ios-transition min-h-11 flex-1 rounded-xl py-1.5 text-[13px] font-semibold leading-tight",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 focus-visible:ring-inset",
                  tab === t.id
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 [@media(hover:hover)]:hover:text-neutral-800",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search
              className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-500"
              aria-hidden
            />
            <input
              id="admin-nurea-search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder={
                tab === "brands"
                  ? "Rechercher une marque…"
                  : "Rechercher un parfum ou une marque…"
              }
              value={search}
              onChange={(e) => onSearchFieldChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30"
            />
          </div>

          {!isLoading && !loadErr ? (
            <div
              className="mb-6"
              role="group"
              aria-label={
                tab === "brands"
                  ? "Filtrer les marques (mode et visibilité)"
                  : "Filtrer les parfums par visibilité"
              }
            >
              {tab === "brands" ? (
                <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto rounded-2xl bg-neutral-200/50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:snap-none [&::-webkit-scrollbar]:hidden">
                  {(
                    [
                      { id: "all" as const, label: "Tout", n: brandListCounts.all },
                      { id: "complete" as const, label: "Complète", n: brandListCounts.complete },
                      { id: "curated" as const, label: "Sélection", n: brandListCounts.curated },
                      { id: "PUBLISHED" as const, label: "Visibles", n: brandListCounts.vis },
                      { id: "DRAFT" as const, label: "Masquées", n: brandListCounts.hid },
                    ] as const
                  ).map((opt) => {
                    const active = brandListFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setBrandListFilter(opt.id);
                          replaceCatalogueUrl({ nextBf: opt.id });
                        }}
                        className={cn(
                          "ios-transition shrink-0 snap-start min-w-[4.9rem] sm:min-w-0 sm:flex-1 min-h-11 rounded-xl py-1.5 text-center text-[11px] sm:text-[12px] font-semibold leading-tight",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 focus-visible:ring-inset",
                          active
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-600 [@media(hover:hover)]:hover:text-neutral-800",
                        )}
                      >
                        {opt.label}
                        <span className="ml-0.5 tabular-nums text-[10px] sm:text-[11px] font-medium text-neutral-700/90">
                          ({opt.n})
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-1 rounded-2xl bg-neutral-200/50 p-1">
                  {(
                    [
                      { id: "all" as VisFilter, label: "Tous", n: perfumeVisCounts.all },
                      { id: "PUBLISHED" as VisFilter, label: "Visibles", n: perfumeVisCounts.vis },
                      { id: "DRAFT" as VisFilter, label: "Masqués", n: perfumeVisCounts.hid },
                    ] as const
                  ).map((opt) => {
                    const active = perfumeVisFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setPerfumeVisFilter(opt.id);
                          replaceCatalogueUrl({ nextPf: opt.id });
                        }}
                        className={cn(
                          "ios-transition flex-1 min-h-11 rounded-xl py-1.5 text-center text-[12px] font-semibold leading-tight",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 focus-visible:ring-inset",
                          active
                            ? "bg-white text-neutral-900 shadow-sm"
                            : "text-neutral-600 [@media(hover:hover)]:hover:text-neutral-800",
                        )}
                      >
                        {opt.label}
                        <span className="ml-0.5 tabular-nums text-[11px] font-medium text-neutral-700/90">
                          ({opt.n})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </motion.div>

        {loadErr ? (
          <div className="px-5 pb-4">
            <SectionCard className="flex items-start gap-3 border-rose-200/80 bg-rose-50/90 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-rose-800">Erreur de chargement</p>
                <p className="mt-0.5 text-[12px] text-neutral-600">{loadErr}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-[12px] font-semibold uppercase tracking-wider text-nurea-bordeaux focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Réessayer
                </button>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {isLoading ? (
          <div className="min-h-[20rem] space-y-3 px-5 pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="admin-skeleton h-[72px] rounded-xl border border-neutral-200/80"
              />
            ))}
          </div>
        ) : tab === "perfumes" ? (
          <div
            className="min-h-[20rem] space-y-3 px-5"
            style={{ paddingBottom: "var(--admin-scroll-bottom-pad)" }}
          >
            {canEdit ? (
              <div className="mb-1 flex justify-end px-0">
                <Link
                  href="/admin/perfumes/new"
                  className="rounded-full bg-nurea-bordeaux/10 p-1.5 text-nurea-bordeaux"
                  aria-label="Nouveau parfum"
                >
                  <Plus size={18} />
                </Link>
              </div>
            ) : null}
            {filteredPerfumes.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-admin-muted">
                Aucun résultat. Ajuste la recherche ou le filtre.
              </p>
            ) : null}
            {filteredPerfumes.map((per) => {
              const pending = pendingStatusIds.has(per.id);
              const pub = per.status === "PUBLISHED";
              return (
                <div
                  key={per.id}
                  className="ios-shadow flex items-center gap-4 rounded-2xl border border-neutral-200/60 bg-white p-3 shadow-sm"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-100">
                    {per.image ? (
                      <Image
                        loader={nureaAdminThumbLoader}
                        src={per.image}
                        alt={`Visuel ${per.name}`}
                        width={56}
                        height={56}
                        sizes="56px"
                        quality={60}
                        fetchPriority="low"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-neutral-300">
                        {per.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{per.name}</h3>
                    <p className="mt-0.5 min-w-0 truncate text-[11px] font-medium text-neutral-600">
                      <button
                        type="button"
                        onClick={() => goToBrandInCatalog(per.brand.name)}
                        className="min-w-0 max-w-full truncate text-left text-nurea-bordeaux outline-none transition-colors focus-visible:ring-2 focus-visible:ring-nurea-bordeaux/30 [@media(hover:hover)]:underline"
                      >
                        {per.brand.name}
                      </button>
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          pub ? "bg-green-500" : "bg-neutral-300",
                        )}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        {pub ? "Visible" : "Masqué"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/perfumes/${per.id}/edit`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-neutral-50 text-neutral-600 hover:text-neutral-900"
                      aria-label="Fiche parfum"
                    >
                      <LayoutGrid size={18} />
                    </Link>
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void toggleVisibility(per.id, per.status)}
                        className={cn(
                          "ios-transition min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl",
                          pub
                            ? "bg-nurea-bordeaux/5 text-nurea-bordeaux"
                            : "bg-neutral-50 text-neutral-300",
                        )}
                        aria-label={pub ? "Masquer" : "Publier"}
                      >
                        {pending ? <span className="text-[10px]">…</span> : <Eye size={18} />}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : tab === "brands" ? (
          <div
            className="min-h-[20rem] space-y-3 px-5"
            style={{ paddingBottom: "var(--admin-scroll-bottom-pad)" }}
          >
            {filteredBrands.length === 0 ? (
              <p className="px-1 py-8 text-center text-sm text-admin-muted">
                Aucun résultat. Ajuste la recherche ou le filtre.
              </p>
            ) : null}
            {filteredBrands.map((brand) => {
              const isComplete = brand.catalogMode === "COMPLETE";
              const ariaLine = isComplete
                ? "Gamme complète, tout le catalogue de la marque est proposé"
                : `${brand._count.perfumes} parfum${brand._count.perfumes !== 1 ? "s" : ""} en sélection`;
              return (
                <Link
                  key={brand.id}
                  href={`/admin/brands/${brand.id}/edit`}
                  aria-label={`${brand.name} — ${ariaLine}`}
                  className="ios-shadow flex items-center gap-4 rounded-3xl border border-neutral-200/60 bg-white p-4 shadow-sm"
                >
                  <BrandListThumb name={brand.name} imageLight={brand.imageLight} image={brand.image} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-neutral-900">{brand.name}</h3>
                    {isComplete ? (
                      <p className="mt-1 text-[11px] leading-snug text-neutral-600">
                        <span className="font-semibold text-nurea-bordeaux">Gamme complète</span>
                        <span> — tout le catalogue de la marque est proposé.</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                        {brand._count.perfumes} parfum{brand._count.perfumes !== 1 ? "s" : ""} en sélection
                      </p>
                    )}
                  </div>
                  <ChevronRight className="shrink-0 text-neutral-300" size={20} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            className="min-h-[20rem] space-y-6 px-5"
            style={{ paddingBottom: "var(--admin-scroll-bottom-pad)" }}
          >
            <div className="rounded-3xl border border-nurea-bordeaux/10 bg-nurea-bordeaux/5 p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-nurea-bordeaux p-2 text-white">
                  <Star size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-nurea-bordeaux">Mise en avant sur l&apos;accueil</h4>
                  <p className="mt-1 text-xs leading-relaxed text-nurea-bordeaux/80">
                    Jusqu&apos;à 2 produits recommandés. Sélection gérée côté boutique.
                  </p>
                </div>
              </div>
            </div>

            <div className="ios-shadow rounded-[32px] border border-neutral-100 bg-white p-4">
              <div className="mb-4 flex items-center gap-3 px-2">
                <Star className="fill-nurea-bordeaux text-nurea-bordeaux" size={16} />
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-600">
                  En avant ({featuredCount}/2)
                </h3>
              </div>
              <div className="space-y-2">
                {featuredOnes.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-neutral-100 py-6 text-center">
                    <p className="text-xs text-admin-muted">Rien en avant — choisis jusqu’à 2 parfums.</p>
                  </div>
                ) : (
                  featuredOnes.map((per) => (
                    <div
                      key={per.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-2"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-white">
                        {per.image ? (
                          <Image
                            loader={nureaAdminThumbLoader}
                            src={per.image}
                            alt={`Visuel ${per.name}`}
                            width={40}
                            height={40}
                            sizes="40px"
                            quality={60}
                            fetchPriority="low"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-neutral-200">
                            {per.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs font-bold">{per.name}</h4>
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={pendingFeaturedIds.has(per.id)}
                          onClick={() => void toggleFeatured(per.id, true)}
                          className="p-2 text-nurea-bordeaux"
                          aria-label="Retirer de la sélection"
                        >
                          <StarOff size={18} />
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 px-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-600">
                  Ajouter à la sélection
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {othersForFeatured.map((per) => (
                  <button
                    key={per.id}
                    type="button"
                    disabled={!canEdit || featuredOnes.length >= 2 || pendingFeaturedIds.has(per.id)}
                    onClick={() => void toggleFeatured(per.id, false)}
                    className="ios-shadow flex flex-col items-center rounded-3xl border border-neutral-100 bg-white p-4 text-center active:scale-95"
                  >
                    <div className="relative mb-3 h-12 w-12 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
                      {per.image ? (
                        <Image
                          loader={nureaAdminThumbLoader}
                          src={per.image}
                          alt={`Visuel ${per.name}`}
                          width={48}
                          height={48}
                          sizes="48px"
                          quality={60}
                          fetchPriority="low"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-neutral-200">
                          {per.name[0]}
                        </div>
                      )}
                    </div>
                    <h4 className="line-clamp-1 text-[11px] font-bold">{per.name}</h4>
                    <div className="mt-2 p-1.5 text-neutral-300 hover:text-nurea-bordeaux">
                      <Star size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

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

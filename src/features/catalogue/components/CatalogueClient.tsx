"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, PackageSearch, Plus, Tag } from "lucide-react";
import { Heading } from "@/ui/primitives/Heading";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { SearchField } from "@/ui/primitives/SearchField";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { WindowedList } from "@/ui/primitives/WindowedList";
import { SkeletonList } from "@/ui/primitives/Skeleton";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Button } from "@/ui/primitives/Button";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { stockStatus } from "@/domain/stock";
import { readJsonSafe } from "@/lib/admin/http";
import type { AdminCatalogueCache, AdminCataloguePayload } from "@/lib/admin/catalogue-types";
import { FilterChips, type ChipOption } from "./FilterChips";
import { PerfumeListRow } from "./PerfumeListRow";
import { BrandListRow } from "./BrandListRow";
import { FeaturedPanel } from "./FeaturedPanel";
import {
  FEATURED_LIMIT,
  parseBrandFilter,
  parsePerfumeFilter,
  parseTab,
  type AdminBrandRow,
  type AdminPerfumeRow,
  type BrandFilter,
  type CatalogueTab,
  type PerfumeFilter,
} from "../types";

const TAB_OPTIONS = [
  { value: "perfumes" as const, label: "Parfums" },
  { value: "brands" as const, label: "Marques" },
  { value: "featured" as const, label: "En avant" },
];

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

export function CatalogueClient({ initialData }: { initialData: AdminCatalogueCache }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin/catalogue";
  const searchParams = useSearchParams();

  const [brands, setBrands] = useState<AdminBrandRow[]>(initialData.brands);
  const [perfumes, setPerfumes] = useState<AdminPerfumeRow[]>(initialData.perfumes);
  const [role] = useState<string | null>(initialData.user?.role ?? null);

  const [tab, setTab] = useState<CatalogueTab>(() => parseTab(searchParams.get("tab")));
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [perfumeFilter, setPerfumeFilter] = useState<PerfumeFilter>(() =>
    // `?stock=low` : lien profond depuis l'alerte stock du tableau de bord.
    searchParams.get("stock") === "low"
      ? "lowStock"
      : parsePerfumeFilter(searchParams.get("pf")),
  );
  const [brandFilter, setBrandFilter] = useState<BrandFilter>(() =>
    parseBrandFilter(searchParams.get("bf")),
  );

  const [pendingPerfumeIds, setPendingPerfumeIds] = useState<ReadonlySet<number>>(new Set());
  const [pendingFeaturedIds, setPendingFeaturedIds] = useState<ReadonlySet<number>>(new Set());
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const canEdit = role !== "VIEWER";

  // ─── Synchronisation de l'URL ──────────────────────────────────────────
  // Débouncée et en `replace` : l'état de filtrage doit survivre au partage
  // d'un lien et au retour arrière, sans polluer l'historique à chaque frappe.
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "perfumes") params.set("tab", tab);
    const q = search.trim();
    if (q) params.set("q", q);
    if (perfumeFilter !== "all") params.set("pf", perfumeFilter);
    if (brandFilter !== "all") params.set("bf", brandFilter);

    const next = params.toString();
    if (next === searchParams.toString()) return;

    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }, 300);
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    };
    // `searchParams` est volontairement hors dépendances : il change en
    // réaction au replace ci-dessus et relancerait la boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, perfumeFilter, brandFilter, pathname, router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/catalogue", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Le catalogue n'a pas pu être rechargé.");
      const data = await readJsonSafe<AdminCataloguePayload>(res);
      setBrands(data?.brands ?? []);
      setPerfumes(data?.perfumes ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ─── Dérivations ───────────────────────────────────────────────────────

  const query = search.trim().toLowerCase();

  const searchedPerfumes = useMemo(() => {
    if (!query) return perfumes;
    return perfumes.filter(
      (p) => matches(p.name, query) || matches(p.brand.name, query),
    );
  }, [perfumes, query]);

  const searchedBrands = useMemo(() => {
    if (!query) return brands;
    return brands.filter((b) => matches(b.name, query));
  }, [brands, query]);

  /** Le stock n'est affiché que si au moins une référence en suit un. */
  const stockTracked = useMemo(
    () => perfumes.some((p) => typeof p.stock === "number" && p.stock > 0),
    [perfumes],
  );

  const perfumeChips = useMemo<ChipOption<PerfumeFilter>[]>(() => {
    const base: ChipOption<PerfumeFilter>[] = [
      { value: "all", label: "Tous", count: searchedPerfumes.length },
      {
        value: "published",
        label: "Visibles",
        count: searchedPerfumes.filter((p) => p.status === "PUBLISHED").length,
      },
      {
        value: "draft",
        label: "Masqués",
        count: searchedPerfumes.filter((p) => p.status !== "PUBLISHED").length,
      },
    ];
    if (stockTracked) {
      base.push({
        value: "lowStock",
        label: "Stock bas",
        count: searchedPerfumes.filter(
          (p) => typeof p.stock === "number" && stockStatus(p.stock) !== "ok",
        ).length,
      });
    }
    return base;
  }, [searchedPerfumes, stockTracked]);

  const brandChips = useMemo<ChipOption<BrandFilter>[]>(
    () => [
      { value: "all", label: "Toutes", count: searchedBrands.length },
      {
        value: "published",
        label: "Visibles",
        count: searchedBrands.filter((b) => b.status === "PUBLISHED").length,
      },
      {
        value: "draft",
        label: "Masquées",
        count: searchedBrands.filter((b) => b.status !== "PUBLISHED").length,
      },
      {
        value: "complete",
        label: "Gamme complète",
        count: searchedBrands.filter((b) => b.catalogMode === "COMPLETE").length,
      },
      {
        value: "curated",
        label: "Sélection",
        count: searchedBrands.filter((b) => b.catalogMode === "CURATED").length,
      },
    ],
    [searchedBrands],
  );

  const visiblePerfumes = useMemo(() => {
    switch (perfumeFilter) {
      case "published":
        return searchedPerfumes.filter((p) => p.status === "PUBLISHED");
      case "draft":
        return searchedPerfumes.filter((p) => p.status !== "PUBLISHED");
      case "lowStock":
        return searchedPerfumes.filter(
          (p) => typeof p.stock === "number" && stockStatus(p.stock) !== "ok",
        );
      default:
        return searchedPerfumes;
    }
  }, [searchedPerfumes, perfumeFilter]);

  const visibleBrands = useMemo(() => {
    switch (brandFilter) {
      case "published":
        return searchedBrands.filter((b) => b.status === "PUBLISHED");
      case "draft":
        return searchedBrands.filter((b) => b.status !== "PUBLISHED");
      case "complete":
        return searchedBrands.filter((b) => b.catalogMode === "COMPLETE");
      case "curated":
        return searchedBrands.filter((b) => b.catalogMode === "CURATED");
      default:
        return searchedBrands;
    }
  }, [searchedBrands, brandFilter]);

  const featured = useMemo(() => perfumes.filter((p) => p.isFeatured), [perfumes]);
  const featuredCandidates = useMemo(
    () => searchedPerfumes.filter((p) => !p.isFeatured),
    [searchedPerfumes],
  );

  // ─── Mutations ─────────────────────────────────────────────────────────

  const withPending = (
    setter: (updater: (prev: ReadonlySet<number>) => ReadonlySet<number>) => void,
    id: number,
    on: boolean,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  async function toggleVisibility(perfume: AdminPerfumeRow) {
    if (pendingPerfumeIds.has(perfume.id)) return;
    const nextStatus = perfume.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    // Garde-fou métier : un parfum ne peut pas être plus visible que sa marque.
    if (nextStatus === "PUBLISHED") {
      if (perfume.brand.status === "DRAFT") {
        setToast({
          type: "error",
          message: `Rends d'abord la marque ${perfume.brand.name} visible.`,
        });
        return;
      }
      if (perfume.brand.catalogMode === "COMPLETE") {
        setToast({
          type: "error",
          message: `${perfume.brand.name} est en gamme complète : ses parfums ne s'affichent pas à l'unité.`,
        });
        return;
      }
    }

    withPending(setPendingPerfumeIds, perfume.id, true);
    setPerfumes((prev) =>
      prev.map((p) => (p.id === perfume.id ? { ...p, status: nextStatus } : p)),
    );

    const res = await fetch(`/api/admin/perfumes/${perfume.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!res.ok) {
      const json = await readJsonSafe<{ error?: string }>(res);
      setPerfumes((prev) =>
        prev.map((p) => (p.id === perfume.id ? { ...p, status: perfume.status } : p)),
      );
      setToast({ type: "error", message: json?.error ?? "Changement impossible." });
    } else {
      setToast({
        type: "success",
        message: nextStatus === "PUBLISHED" ? "Parfum visible." : "Parfum masqué.",
      });
    }
    withPending(setPendingPerfumeIds, perfume.id, false);
  }

  async function toggleFeatured(perfume: AdminPerfumeRow, next: boolean) {
    if (pendingFeaturedIds.has(perfume.id)) return;
    if (next && featured.length >= FEATURED_LIMIT) {
      setToast({
        type: "error",
        message: `Retire d'abord un parfum : ${FEATURED_LIMIT} emplacements au maximum.`,
      });
      return;
    }

    withPending(setPendingFeaturedIds, perfume.id, true);
    setPerfumes((prev) =>
      prev.map((p) => (p.id === perfume.id ? { ...p, isFeatured: next } : p)),
    );

    const res = await fetch(`/api/admin/perfumes/${perfume.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: next }),
    });

    if (!res.ok) {
      const json = await readJsonSafe<{ error?: string }>(res);
      setPerfumes((prev) =>
        prev.map((p) => (p.id === perfume.id ? { ...p, isFeatured: !next } : p)),
      );
      setToast({ type: "error", message: json?.error ?? "Changement impossible." });
    } else {
      setToast({
        type: "success",
        message: next ? "Parfum mis en avant." : "Mise en avant retirée.",
      });
    }
    withPending(setPendingFeaturedIds, perfume.id, false);
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────

  const fabHref =
    tab === "perfumes" ? "/admin/perfumes/new" : tab === "brands" ? "/admin/brands/new" : null;

  const searchPlaceholder =
    tab === "brands" ? "Rechercher une marque…" : "Rechercher un parfum, une marque…";

  return (
    <PageScaffold padding={4} ariaLabel="Catalogue">
      {/* Titre non collant : il libère sa hauteur dès le premier geste de
          défilement. Seule la barre d'outils reste épinglée, parce que
          chercher et filtrer se fait au milieu de la liste. */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading level={1}>Catalogue</Heading>
          <p className="mt-0.5 text-[13px] tabular-nums text-[var(--admin-text-muted)]">
            {perfumes.length} parfums · {brands.length} marques
          </p>
        </div>
        {/* Le bouton flottant se posait sur la colonne de droite des lignes —
            mesuré, il recouvrait l'œil de visibilité d'un parfum. Et il
            montrait un « + » à soixante pixels de celui de la barre d'onglets,
            qui ouvre la vente. */}
        {canEdit && fabHref ? (
          <Link href={fabHref} className="shrink-0">
            <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />}>
              {tab === "perfumes" ? "Parfum" : "Marque"}
            </Button>
          </Link>
        ) : null}
      </header>

      {/*
        Les onglets sortent de la zone épinglée, la recherche y reste.

        Le bloc collant faisait 124 px, soit près d'un tiers d'un écran de
        téléphone confisqué pendant tout le défilement. Or on ne change pas de
        section au milieu d'une liste — on le fait en arrivant, une fois — alors
        qu'on cherche, lui, à n'importe quel moment. Les onglets libèrent donc
        leur hauteur au premier geste, la recherche reste sous le pouce : 60 px
        rendus en permanence, une ligne de parfum de plus.
      */}
      <SegmentedControl
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        ariaLabel="Section du catalogue"
      />

      <div
        className="sticky top-0 z-20 -mx-4 -mb-4 flex flex-col gap-2 px-4 pb-4 pt-1"
        style={{ background: "var(--admin-bg)" }}
      >
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          ariaLabel={searchPlaceholder}
        />
        {tab === "perfumes" ? (
          <FilterChips
            options={perfumeChips}
            value={perfumeFilter}
            onChange={setPerfumeFilter}
            ariaLabel="Filtrer les parfums"
          />
        ) : null}
        {tab === "brands" ? (
          <FilterChips
            options={brandChips}
            value={brandFilter}
            onChange={setBrandFilter}
            ariaLabel="Filtrer les marques"
          />
        ) : null}
      </div>

      {loadError ? (
        <EmptyState
          icon={AlertCircle}
          title="Chargement échoué"
          description={loadError}
          action={
            <Button variant="secondary" isLoading={refreshing} onClick={() => void refresh()}>
              Réessayer
            </Button>
          }
        />
      ) : refreshing ? (
        <SkeletonList count={6} />
      ) : tab === "perfumes" ? (
        visiblePerfumes.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={query ? "Aucun résultat" : "Aucun parfum"}
            description={
              query
                ? `Rien ne correspond à « ${search.trim()} ».`
                : "Ajoute un parfum pour démarrer le catalogue."
            }
            action={
              !query && canEdit ? (
                <Link href="/admin/perfumes/new" prefetch={false}>
                  <Button variant="primary" leadingIcon={<Plus size={16} />}>
                    Nouveau parfum
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <WindowedList
            items={visiblePerfumes}
            itemKey={(p) => p.id}
            estimateSize={64}
            gap={8}
            aria-label="Liste des parfums"
            renderItem={(perfume) => (
              <PerfumeListRow
                perfume={perfume}
                canEdit={canEdit}
                pending={pendingPerfumeIds.has(perfume.id)}
                stockTracked={stockTracked}
                onToggleVisibility={() => void toggleVisibility(perfume)}
              />
            )}
          />
        )
      ) : tab === "brands" ? (
        visibleBrands.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={query ? "Aucun résultat" : "Aucune marque"}
            description={
              query
                ? `Rien ne correspond à « ${search.trim()} ».`
                : "Crée une marque avant d'ajouter ses parfums."
            }
          />
        ) : (
          <WindowedList
            items={visibleBrands}
            itemKey={(b) => b.id}
            estimateSize={64}
            gap={8}
            aria-label="Liste des marques"
            renderItem={(brand) => <BrandListRow brand={brand} />}
          />
        )
      ) : (
        <FeaturedPanel
          featured={featured}
          candidates={featuredCandidates}
          canEdit={canEdit}
          pendingIds={pendingFeaturedIds}
          onToggle={(perfume, next) => void toggleFeatured(perfume, next)}
        />
      )}

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </PageScaffold>
  );
}

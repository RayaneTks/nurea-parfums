"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  FlaskConical,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Eye,
} from "lucide-react";
import { clsx } from "clsx";
import {
  BRAND_ASSORTMENT_LABELS,
  BRAND_POSITIONING_LABELS,
} from "@/lib/catalog/brandTaxonomy";
import { AdminMobileDockSpacer, AdminNav } from "./AdminNav";

type SessionUser = { username: string; role: string };

type BrandRow = {
  id: string;
  name: string;
  slug: string;
  assortment: string;
  positioning: string;
  _count: { perfumes: number };
};

const ASSORTMENT_KEYS = ["UNSET", "COMPLETE", "CURATED"] as const;
const POSITIONING_KEYS = ["UNSET", "NICHE", "DESIGNER", "ARTISAN"] as const;

type PerfumeRow = {
  id: number;
  name: string;
  category: string;
  status: string;
  deletedAt: string | null;
  brand: { name: string };
};

type AdminSection = "overview" | "brands" | "perfumes";
type PerfumeFilter = "all" | "PUBLISHED" | "DRAFT" | "ARCHIVED" | "hidden";

function statusPillClass(status: string): string {
  const base =
    "inline-flex items-center border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.06em]";
  if (status === "PUBLISHED") {
    return `${base} border-emerald-800/20 bg-emerald-600/12 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/40 dark:text-emerald-100`;
  }
  if (status === "DRAFT") {
    return `${base} border-amber-800/25 bg-amber-500/12 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100`;
  }
  if (status === "ARCHIVED") {
    return `${base} border-[var(--nurea-border-hover)] bg-black/10 text-[var(--nurea-text-subtle)] dark:bg-black/20`;
  }
  return `${base} border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)]`;
}

function statusLabel(status: string): string {
  if (status === "PUBLISHED") return "Publié";
  if (status === "DRAFT") return "Brouillon";
  if (status === "ARCHIVED") return "Archivé";
  return status;
}

const sectionTabs: { id: AdminSection; label: string; icon: typeof Layers }[] = [
  { id: "overview", label: "Vue d’ensemble", icon: Layers },
  { id: "brands", label: "Marques", icon: Building2 },
  { id: "perfumes", label: "Parfums", icon: FlaskConical },
];

export function AdminDashboard() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [brandMsg, setBrandMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<AdminSection>("overview");
  const [perfumeFilter, setPerfumeFilter] = useState<PerfumeFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setLoadErr(null);
    setRefreshing(true);
    try {
      const [s, b, p] = await Promise.all([
        fetch("/api/admin/session", { credentials: "include" }),
        fetch("/api/admin/brands", { credentials: "include" }),
        fetch("/api/admin/perfumes?includeDeleted=1", { credentials: "include" }),
      ]);
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      if (b.ok) {
        const bj = (await b.json()) as { brands: BrandRow[] };
        setBrands(bj.brands ?? []);
      }
      if (p.ok) {
        const pj = (await p.json()) as { perfumes: PerfumeRow[] };
        setPerfumes(pj.perfumes ?? []);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const total = perfumes.length;
    const published = perfumes.filter((p) => p.status === "PUBLISHED" && !p.deletedAt).length;
    const draft = perfumes.filter((p) => p.status === "DRAFT" && !p.deletedAt).length;
    const hidden = perfumes.filter((p) => p.deletedAt).length;
    return {
      brands: brands.length,
      total,
      published,
      draft,
      hidden,
    };
  }, [brands.length, perfumes]);

  const filteredPerfumes = useMemo(() => {
    let rows = perfumes;
    if (perfumeFilter === "PUBLISHED" || perfumeFilter === "DRAFT" || perfumeFilter === "ARCHIVED") {
      rows = rows.filter((r) => r.status === perfumeFilter);
    } else if (perfumeFilter === "hidden") {
      rows = rows.filter((r) => r.deletedAt);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const idStr = String(row.id);
      return (
        idStr.includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.brand.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
  }, [perfumes, search, perfumeFilter]);

  const canEdit = user?.role !== "VIEWER";

  async function addBrand(e: React.FormEvent) {
    e.preventDefault();
    setBrandMsg(null);
    const name = newBrand.trim();
    if (name.length < 2) return;
    const r = await fetch("/api/admin/brands", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      setBrandMsg(j.error ?? "Refusé");
      return;
    }
    setNewBrand("");
    setBrandMsg("Marque créée.");
    refresh();
  }

  async function patchBrand(id: string, patch: { assortment?: string; positioning?: string }) {
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

  async function removePerfume(id: number, name: string) {
    if (!confirm(`Archiver « ${name} » ? Le parfum disparaîtra de la vitrine (suppression douce).`)) return;
    const r = await fetch(`/api/admin/perfumes/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      alert(j.error ?? "Erreur");
      return;
    }
    refresh();
  }

  const selectFieldClass =
    "mt-1.5 block min-h-11 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-2.5 text-[15px] text-[var(--nurea-text)] transition-colors focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none disabled:opacity-50";

  const filterPills: { id: PerfumeFilter; label: string }[] = [
    { id: "all", label: "Tous" },
    { id: "PUBLISHED", label: "Publiés" },
    { id: "DRAFT", label: "Brouillons" },
    { id: "ARCHIVED", label: "Archivés" },
    { id: "hidden", label: "Masqués" },
  ];

  return (
    <div className="min-h-screen bg-[var(--nurea-bg)] text-[var(--nurea-text)]">
      <AdminNav />
      <main className="mx-auto max-w-[1200px] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-5 sm:px-4 md:px-10 md:pt-8">
        <AdminMobileDockSpacer />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h1 className="font-serif text-[clamp(1.5rem,4vw,2.25rem)] leading-tight tracking-tight text-[var(--nurea-text)]">
              Catalogue
            </h1>
            {user ? (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-[var(--nurea-text-muted)]">
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-2.5 py-1 text-[12px] font-medium text-[var(--nurea-text)]">
                  <Tag className="h-3.5 w-3.5 text-[var(--nurea-cuivre)]" aria-hidden />
                  {user.username}
                </span>
                <span className="text-[var(--nurea-text-subtle)]">·</span>
                <span>{user.role === "VIEWER" ? "Lecture seule" : user.role}</span>
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={refreshing}
              aria-label="Rafraîchir les données"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)]/40 hover:text-[var(--nurea-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)] disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw className={clsx("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
              Actualiser
            </button>
            {canEdit ? (
              <Link
                href="/admin/perfumes/new"
                className="btn-nurea btn-accent inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 text-[12px] tracking-[0.12em] sm:w-auto sm:min-w-[200px]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Nouveau parfum
              </Link>
            ) : null}
          </div>
        </div>

        {loadErr ? (
          <p
            className="mt-5 border border-[var(--nurea-accent)]/40 bg-[var(--nurea-accent-subtle)] px-4 py-3 text-[14px] text-[var(--nurea-accent)]"
            role="alert"
          >
            {loadErr}
          </p>
        ) : null}

        {/* Onglets principaux (mobile-first) */}
        <div
          className="mt-6 flex gap-1 overflow-x-auto overflow-y-hidden pb-1 [-webkit-overflow-scrolling:touch] md:mt-8"
          role="tablist"
          aria-label="Sections du catalogue"
        >
          {sectionTabs.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(id)}
                className={clsx(
                  "flex min-h-11 shrink-0 items-center gap-2 border px-3 py-2.5 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-bg)] sm:px-4",
                  active
                    ? "border-[var(--nurea-accent)]/55 bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                    : "border-[var(--nurea-border)] bg-[var(--nurea-surface)] text-[var(--nurea-text-muted)] hover:border-[var(--nurea-border-hover)] hover:text-[var(--nurea-text)]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--nurea-cuivre)]" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 md:mt-6" role="tabpanel">
          {section === "overview" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nurea-text-subtle)]">
                    <Building2 className="h-4 w-4 text-[var(--nurea-cuivre)]" aria-hidden />
                    Marques
                  </div>
                  <p className="mt-2 font-serif text-3xl text-[var(--nurea-text)]">{stats.brands}</p>
                </div>
                <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nurea-text-subtle)]">
                    <FlaskConical className="h-4 w-4 text-[var(--nurea-accent)]" aria-hidden />
                    Parfums
                  </div>
                  <p className="mt-2 font-serif text-3xl text-[var(--nurea-text)]">{stats.total}</p>
                </div>
                <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nurea-text-subtle)]">
                    <Eye className="h-4 w-4 text-emerald-400/90" aria-hidden />
                    En vitrine
                  </div>
                  <p className="mt-2 font-serif text-3xl text-[var(--nurea-text)]">{stats.published}</p>
                </div>
                <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nurea-text-subtle)]">
                    <Archive className="h-4 w-4 text-[var(--nurea-text-muted)]" aria-hidden />
                    Masqués
                  </div>
                  <p className="mt-2 font-serif text-3xl text-[var(--nurea-text)]">{stats.hidden}</p>
                </div>
              </div>

              <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 sm:p-5">
                <h2 className="text-[15px] font-semibold text-[var(--nurea-text)]">Par où commencer</h2>
                <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-[var(--nurea-text-muted)]">
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] text-[12px] font-bold text-[var(--nurea-accent)]">
                      1
                    </span>
                    <span>
                      Créez vos <strong className="text-[var(--nurea-text)]">marques</strong> (onglet Marques), puis définissez l’assortiment vitrine et l’univers pour le panneau « Explorer ».
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] text-[12px] font-bold text-[var(--nurea-accent)]">
                      2
                    </span>
                    <span>
                      Ajoutez des <strong className="text-[var(--nurea-text)]">parfums</strong> avec image et statut ; utilisez les filtres pour suivre brouillons et publications.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] bg-[var(--nurea-bg)] text-[12px] font-bold text-[var(--nurea-accent)]">
                      3
                    </span>
                    <span>
                      Ouvrez la <strong className="text-[var(--nurea-text)]">vitrine</strong> depuis l’en-tête pour vérifier le rendu public.
                    </span>
                  </li>
                </ol>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("brands")}
                    className="inline-flex min-h-11 items-center gap-2 border border-[var(--nurea-border-hover)] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]"
                  >
                    <Building2 className="h-4 w-4 text-[var(--nurea-cuivre)]" aria-hidden />
                    Gérer les marques
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("perfumes")}
                    className="inline-flex min-h-11 items-center gap-2 border border-[var(--nurea-accent)]/45 bg-[var(--nurea-accent-subtle)] px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]"
                  >
                    <FlaskConical className="h-4 w-4 text-[var(--nurea-accent)]" aria-hidden />
                    Voir les parfums
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {section === "brands" ? (
            <div className="space-y-5">
              <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--nurea-cuivre)]" aria-hidden />
                  <div>
                    <h2 className="text-[15px] font-semibold text-[var(--nurea-text)]">Marques</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--nurea-text-muted)]">
                      Chaque marque peut être rattachée à des parfums. L’assortiment et l’univers alimentent les filtres{" "}
                      <code className="text-[12px] text-[var(--nurea-text-subtle)]">maison</code> /{" "}
                      <code className="text-[12px] text-[var(--nurea-text-subtle)]">univers</code> sur l’accueil.
                    </p>
                  </div>
                </div>

                <ul className="mt-5 max-h-[min(70vh,560px)] space-y-0 divide-y divide-[var(--nurea-border)] overflow-y-auto overscroll-contain">
                  {brands.length === 0 ? (
                    <li className="py-8 text-center text-[14px] text-[var(--nurea-text-muted)]">
                      Aucune marque. Ajoutez-en une ci-dessous.
                    </li>
                  ) : (
                    brands.map((b) => (
                      <li
                        key={b.id}
                        className="border-l-2 border-[var(--nurea-cuivre)]/50 py-4 pl-4 first:pt-0"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="min-w-0 font-medium text-[var(--nurea-text)]">{b.name}</p>
                          <span className="shrink-0 text-[12px] text-[var(--nurea-text-subtle)]">
                            {b._count.perfumes} parfum{b._count.perfumes !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]">
                            Assortiment vitrine
                            <select
                              value={b.assortment}
                              disabled={!canEdit}
                              onChange={(e) => patchBrand(b.id, { assortment: e.target.value })}
                              className={selectFieldClass}
                            >
                              {ASSORTMENT_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {BRAND_ASSORTMENT_LABELS[k].title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]">
                            Univers
                            <select
                              value={b.positioning}
                              disabled={!canEdit}
                              onChange={(e) => patchBrand(b.id, { positioning: e.target.value })}
                              className={selectFieldClass}
                            >
                              {POSITIONING_KEYS.map((k) => (
                                <option key={k} value={k}>
                                  {BRAND_POSITIONING_LABELS[k].title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </li>
                    ))
                  )}
                </ul>

                <form onSubmit={addBrand} className="mt-6 space-y-4 border-t border-[var(--nurea-border)] pt-5">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]">
                    Nouvelle marque
                    <input
                      value={newBrand}
                      onChange={(e) => setNewBrand(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Ex. Maison…"
                      className="mt-1.5 block min-h-12 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] px-3 py-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none disabled:opacity-50"
                    />
                  </label>
                  {brandMsg ? (
                    <p className="text-[13px] text-[var(--nurea-text-muted)]">{brandMsg}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!canEdit}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-[var(--nurea-accent)]/50 bg-[var(--nurea-accent-subtle)] text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text)] transition-colors hover:border-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)] disabled:opacity-50 sm:w-auto sm:px-8"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Ajouter la marque
                  </button>
                </form>
                {!canEdit ? (
                  <p className="mt-4 text-[12px] leading-relaxed text-[var(--nurea-text-subtle)]">
                    Compte en lecture seule : création et modification désactivées.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {section === "perfumes" ? (
            <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)]">
              <div className="flex flex-col gap-4 border-b border-[var(--nurea-border)] p-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:p-5">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--nurea-text)]">
                    <FlaskConical className="h-5 w-5 text-[var(--nurea-accent)]" aria-hidden />
                    Parfums
                  </h2>
                  <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">
                    {filteredPerfumes.length} affiché{filteredPerfumes.length !== 1 ? "s" : ""} · {perfumes.length} au total
                  </p>
                </div>
                <div className="relative w-full sm:max-w-sm">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nurea-text-subtle)]"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nom, marque, n°, catégorie…"
                    autoComplete="off"
                    className="block min-h-12 w-full border border-[var(--nurea-border)] bg-[var(--nurea-bg)] py-3 pl-10 pr-3 text-base text-[var(--nurea-text)] placeholder:text-[var(--nurea-text-subtle)] focus-visible:border-[var(--nurea-accent)] focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-b border-[var(--nurea-border)] px-4 py-3 sm:px-5">
                {filterPills.map(({ id, label }) => {
                  const active = perfumeFilter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPerfumeFilter(id)}
                      className={clsx(
                        "min-h-9 rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]",
                        active
                          ? "border-[var(--nurea-accent)]/55 bg-[var(--nurea-accent-subtle)] text-[var(--nurea-text)]"
                          : "border-[var(--nurea-border)] text-[var(--nurea-text-muted)] hover:border-[var(--nurea-border-hover)] hover:text-[var(--nurea-text)]"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {filteredPerfumes.length === 0 ? (
                <p className="p-8 text-center text-[14px] text-[var(--nurea-text-muted)]">
                  {perfumes.length === 0
                    ? "Aucun parfum. Créez-en un depuis le bouton « Nouveau parfum »."
                    : "Aucun résultat pour ces critères."}
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-[var(--nurea-border)] lg:hidden">
                    {filteredPerfumes.map((row) => (
                      <li key={row.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[11px] text-[var(--nurea-text-subtle)]">#{row.id}</p>
                            <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--nurea-text)]">{row.name}</p>
                            <p className="mt-1 text-[13px] text-[var(--nurea-text-muted)]">{row.brand.name}</p>
                            <p className="mt-0.5 text-[12px] text-[var(--nurea-text-subtle)]">{row.category}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                              {row.deletedAt ? (
                                <span className="inline-flex items-center gap-1 border border-[var(--nurea-accent)]/50 px-2 py-1 text-[11px] text-[var(--nurea-accent)]">
                                  <Archive className="h-3 w-3" aria-hidden />
                                  Masqué
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Link
                            href={`/admin/perfumes/${row.id}/edit`}
                            className="btn-nurea btn-accent inline-flex min-h-12 flex-1 items-center justify-center gap-2 text-[12px] tracking-[0.08em]"
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                            {canEdit ? "Modifier" : "Consulter"}
                          </Link>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => removePerfume(row.id, row.name)}
                              aria-label={`Archiver ${row.name}`}
                              className="inline-flex min-h-12 min-w-12 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]"
                            >
                              <Archive className="h-5 w-5" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[720px] text-left text-[14px]">
                      <thead className="border-b border-[var(--nurea-border)] text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nurea-text-muted)]">
                        <tr>
                          <th className="px-5 py-3 font-medium">ID</th>
                          <th className="px-5 py-3 font-medium">Nom</th>
                          <th className="px-5 py-3 font-medium">Marque</th>
                          <th className="px-5 py-3 font-medium">Catégorie</th>
                          <th className="px-5 py-3 font-medium">Statut</th>
                          <th className="px-5 py-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPerfumes.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-[var(--nurea-border)]/60 transition-colors hover:bg-[var(--nurea-surface-hover)]"
                          >
                            <td className="px-5 py-3.5 font-mono text-[12px] text-[var(--nurea-text-subtle)]">
                              {row.id}
                            </td>
                            <td className="max-w-[220px] px-5 py-3.5 font-medium">
                              <span className="line-clamp-2">{row.name}</span>
                              {row.deletedAt ? (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-[var(--nurea-accent)]">
                                  <Archive className="h-3 w-3" aria-hidden />
                                  masqué
                                </span>
                              ) : null}
                            </td>
                            <td className="px-5 py-3.5 text-[var(--nurea-text-muted)]">{row.brand.name}</td>
                            <td className="px-5 py-3.5 text-[var(--nurea-text-muted)]">{row.category}</td>
                            <td className="px-5 py-3.5">
                              <span className={statusPillClass(row.status)}>{statusLabel(row.status)}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex flex-wrap justify-end gap-2">
                                <Link
                                  href={`/admin/perfumes/${row.id}/edit`}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--nurea-accent)]/45 bg-[var(--nurea-accent-subtle)] text-[var(--nurea-accent)] transition-colors hover:border-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]"
                                  aria-label={canEdit ? `Modifier ${row.name}` : `Voir ${row.name}`}
                                >
                                  {canEdit ? (
                                    <Pencil className="h-4 w-4" aria-hidden />
                                  ) : (
                                    <Eye className="h-4 w-4" aria-hidden />
                                  )}
                                </Link>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => removePerfume(row.id, row.name)}
                                    aria-label={`Archiver ${row.name}`}
                                    className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--nurea-border-hover)] text-[var(--nurea-text-muted)] transition-colors hover:border-[var(--nurea-accent)] hover:text-[var(--nurea-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nurea-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nurea-surface)]"
                                  >
                                    <Archive className="h-4 w-4" aria-hidden />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

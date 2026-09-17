"use client";

import { Package, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import type { AdminCatalogue } from "@/contracts/catalogue";
import { routes } from "@/app-shell/routes";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Chip } from "@/ui/primitives/Chip";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { WindowedList } from "@/ui/primitives/WindowedList";
import { BrandRow } from "./BrandRow";
import {
  brandCounts,
  chipShown,
  filterBrands,
  filterPerfumes,
  perfumeCounts,
  searchWords,
} from "./catalogue-model";
import { FeaturedPanel } from "./FeaturedPanel";
import { usePendingRemovals } from "./pending-removals";
import { PerfumeRow } from "./PerfumeRow";
import { useCatalogueUrl } from "./useCatalogueUrl";

/** Hauteur d'une rangée (56 px) et de son filet : pas de la liste fenêtrée. */
const ROW_STRIDE = 57;

function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label="Filtres"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

function RowList<T>({ items, itemKey, label, render }: { items: readonly T[]; itemKey: (item: T) => string | number; label: string; render: (item: T) => ReactNode }) {
  return (
    <Card padding={0}>
      <WindowedList
        items={items}
        itemKey={itemKey}
        estimateSize={ROW_STRIDE}
        gap={0}
        aria-label={label}
        renderItem={(item, index) => <div className={index > 0 ? "border-t border-[var(--admin-border)]" : undefined}>{render(item)}</div>}
      />
    </Card>
  );
}

/**
 * Listes de l'écran Catalogue (06 E15 zones 2-5), filtrées sur l'instantané admin : chips à compteur
 * rendus seulement s'ils discriminent, filtre venu d'un lien toujours affiché et effaçable, vide de départ
 * et vide de filtre distincts — jamais la liste entière sous un filtre actif.
 */
export function CatalogueLists({ catalogue }: { catalogue: AdminCatalogue }) {
  const router = useRouter();
  const { tab, query, stock, hidden, complete, write } = useCatalogueUrl();
  const removals = usePendingRemovals();
  const words = useMemo(() => searchWords(query), [query]);

  const perfumes = useMemo(
    () => catalogue.perfumes.filter((perfume) => !removals.has(`parfum:${perfume.id}`) && !removals.has(`marque:${perfume.brand.id}`)),
    [catalogue.perfumes, removals],
  );
  const brands = useMemo(() => catalogue.brands.filter((brand) => !removals.has(`marque:${brand.id}`)), [catalogue.brands, removals]);

  const clearFilters = () => write({ q: null, stock: null, visibilite: null, gamme: null });

  if (tab === "en-avant") {
    return <FeaturedPanel perfumes={perfumes} words={words} onClearSearch={() => write({ q: null })} />;
  }

  if (tab === "marques") {
    const counts = brandCounts(brands, words);
    const shown = filterBrands(brands, { words, hidden, complete });
    const filtered = words.length > 0 || hidden || complete;
    const add = (
      <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />} ariaLabel="Nouvelle marque" onClick={() => router.push(routes.nouvelleMarque())}>
        Marque
      </Button>
    );
    if (brands.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="Aucune marque"
          description="Crée la première marque pour y ranger des parfums."
          action={
            <Button variant="primary" onClick={() => router.push(routes.nouvelleMarque())}>
              Ajouter une marque
            </Button>
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {chipShown(counts.hidden, counts.total, hidden) || chipShown(counts.complete, counts.total, complete) ? (
          <ChipRow>
            {chipShown(counts.hidden, counts.total, hidden) ? (
              <Chip active={hidden} clearable={hidden} count={counts.hidden || undefined} onClick={() => write({ visibilite: hidden ? null : "masques" })}>
                Masquées
              </Chip>
            ) : null}
            {chipShown(counts.complete, counts.total, complete) ? (
              <Chip active={complete} clearable={complete} count={counts.complete || undefined} onClick={() => write({ gamme: complete ? null : "complete" })}>
                Gammes complètes
              </Chip>
            ) : null}
          </ChipRow>
        ) : null}
        <SectionHeader level={2} title={`${shown.length} marque${shown.length > 1 ? "s" : ""}`} action={add} />
        {shown.length === 0 ? (
          <EmptyState
            title="Aucune marque ne correspond"
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <RowList items={shown} itemKey={(brand) => brand.id} label={filtered ? "Marques filtrées" : "Marques"} render={(brand) => <BrandRow brand={brand} />} />
        )}
      </div>
    );
  }

  const counts = perfumeCounts(perfumes, words);
  const shown = filterPerfumes(perfumes, { words, stock, hidden });
  if (perfumes.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Catalogue vide"
        description="Ajoute un premier parfum : photo, marque, nom et prix."
        action={
          <Button variant="primary" onClick={() => router.push(routes.nouveauParfum())}>
            Ajouter un parfum
          </Button>
        }
      />
    );
  }
  const chips = [
    { key: "hidden", label: "Masqués", count: counts.hidden, active: hidden, toggle: () => write({ visibilite: hidden ? null : "masques" }) },
    { key: "low", label: "Stock bas", count: counts.low, active: stock === "bas", toggle: () => write({ stock: stock === "bas" ? null : "bas" }) },
    { key: "out", label: "Rupture", count: counts.out, active: stock === "rupture", toggle: () => write({ stock: stock === "rupture" ? null : "rupture" }) },
  ].filter((chip) => chipShown(chip.count, counts.total, chip.active));

  return (
    <div className="flex flex-col gap-3">
      {chips.length > 0 ? (
        <ChipRow>
          {chips.map((chip) => (
            <Chip key={chip.key} active={chip.active} clearable={chip.active} count={chip.count || undefined} onClick={chip.toggle}>
              {chip.label}
            </Chip>
          ))}
        </ChipRow>
      ) : null}
      <SectionHeader
        level={2}
        title={`${shown.length} parfum${shown.length > 1 ? "s" : ""}`}
        action={
          <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />} ariaLabel="Nouveau parfum" onClick={() => router.push(routes.nouveauParfum())}>
            Parfum
          </Button>
        }
      />
      {shown.length === 0 ? (
        <EmptyState
          title="Aucun parfum ne correspond"
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          }
        />
      ) : (
        <RowList items={shown} itemKey={(perfume) => perfume.id} label="Parfums" render={(perfume) => <PerfumeRow perfume={perfume} />} />
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PickerCatalogue, PickerPerfume } from "@/contracts/catalogue";
import type { RecentlySoldDTO } from "@/contracts/documents";
import { eurFromWire, formatEur } from "@/domain/money";
import { stockLabel } from "@/domain/stock";
import { SelectSheet, type SelectOption } from "@/ui/patterns/SelectSheet";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";

type PerfumePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogue: PickerCatalogue | null;
  loading: boolean;
  error: { message: string; onRetry: () => void } | null;
  recent: readonly RecentlySoldDTO[];
  /** Quantités déjà sur le document, par parfum (« Au ticket ×2 »). */
  inDocument: ReadonlyMap<number, number>;
  onPick: (perfume: PickerPerfume) => void;
};

/**
 * S05 — Sélecteur de parfum (06 S05) pour « Ajouter un article » de la fiche en édition : « Vendus récemment » en
 * tête, recherche insensible aux accents (nom, marque), un badge au plus (« Rupture », « Stock bas », « Masqué »),
 * « Au ticket ×2 » pour un parfum déjà présent. Le sous-formulaire « Hors catalogue » arrive au jalon J9.
 */
export function PerfumePicker({ open, onOpenChange, catalogue, loading, error, recent, inDocument, onPick }: PerfumePickerProps) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map((catalogue?.perfumes ?? []).map((perfume) => [String(perfume.id), perfume])), [catalogue]);

  const options = useMemo<SelectOption[]>(
    () =>
      (catalogue?.perfumes ?? []).map((perfume) => {
        const count = inDocument.get(perfume.id);
        const badge =
          count !== undefined ? (
            <Badge tone="accent">Au ticket ×{count}</Badge>
          ) : perfume.stockStatus === "out" ? (
            <Badge tone="danger">{stockLabel("out")}</Badge>
          ) : perfume.stockStatus === "low" ? (
            <Badge tone="warning">{stockLabel("low")}</Badge>
          ) : perfume.status === "DRAFT" ? (
            <Badge>Masqué</Badge>
          ) : undefined;
        const price = perfume.pricing.at(-1);
        return {
          value: String(perfume.id),
          label: perfume.name,
          description: price ? `${perfume.brandName} · ${price.volumeMl} ml · ${formatEur(eurFromWire(price.unitPriceEur))}` : perfume.brandName,
          keywords: [perfume.brandName, perfume.searchKey],
          leading: <Avatar name={perfume.name} src={perfume.image || null} size="md" />,
          trailing: badge,
        };
      }),
    [catalogue, inDocument],
  );

  const recentIds = recent.map((item) => String(item.perfumeId)).filter((id) => byId.has(id));

  return (
    <SelectSheet
      open={open}
      onOpenChange={onOpenChange}
      nested
      title="Ajouter un article"
      options={options}
      onSelect={(value) => {
        const perfume = byId.get(value);
        if (perfume) onPick(perfume);
      }}
      recent={recentIds.length > 0 ? recentIds : undefined}
      recentTitle="Vendus récemment"
      listAllBeforeSearch={recentIds.length === 0}
      searchPlaceholder="Parfum ou marque"
      autoFocusSearch
      query={query}
      onQueryChange={setQuery}
      loading={loading && !catalogue}
      error={error}
      empty={{ title: (q) => (q ? `Aucun parfum ne correspond à « ${q} »` : "Aucun parfum au catalogue") }}
    />
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PickerCatalogue, PickerPerfume } from "@/contracts/catalogue";
import type { RecentlySoldDTO } from "@/contracts/documents";
import { eurFromWire, formatEur } from "@/domain/money";
import { cleNom, normaliseMarque, normaliseParfum, trouveParNom } from "@/lib/nommage";
import { FormField } from "@/ui/patterns/FormField";
import { SelectSheet, type SelectCreateContext, type SelectOption } from "@/ui/patterns/SelectSheet";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { Text } from "@/ui/primitives/Text";
import { stockBadgeOf } from "./line-draft";

export type OffCatalogChoice = { name: string; brandName: string | null };

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
  /** Sous-formulaire « Hors catalogue » (06 S05 zone 4) ; absent : pas d'article hors catalogue. */
  onOffCatalog?: (choice: OffCatalogChoice) => void;
  /** Ouvert depuis une autre sheet (fiche document) ; le composeur l'ouvre depuis la page. */
  nested?: boolean;
  title?: string;
};

/**
 * S05 — Sélecteur de parfum (06 S05) : « Vendus récemment » en tête, recherche insensible aux accents (nom, marque),
 * un badge au plus (« Rupture », « Stock bas », « Masqué »), « Au ticket ×2 » pour un parfum déjà présent ; dès qu'un
 * texte est saisi, « Hors catalogue : « … » » ouvre le sous-formulaire dans la même sheet. La saisie est conservée
 * d'une ouverture à l'autre.
 */
export function PerfumePicker({
  open,
  onOpenChange,
  catalogue,
  loading,
  error,
  recent,
  inDocument,
  onPick,
  onOffCatalog,
  nested = true,
  title = "Ajouter un article",
}: PerfumePickerProps) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map((catalogue?.perfumes ?? []).map((perfume) => [String(perfume.id), perfume])), [catalogue]);

  const options = useMemo<SelectOption[]>(
    () =>
      (catalogue?.perfumes ?? []).map((perfume) => {
        const count = inDocument.get(perfume.id);
        const stock = stockBadgeOf(perfume);
        const badge =
          count !== undefined ? (
            <Badge tone="accent">Au ticket ×{count}</Badge>
          ) : stock ? (
            <Badge tone={stock.tone}>{stock.label}</Badge>
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
      nested={nested}
      title={title}
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
      onCreate={
        onOffCatalog
          ? {
              label: (q) => (q ? `Hors catalogue : « ${q} »` : "Hors catalogue"),
              form: (ctx) => (
                <OffCatalogForm
                  ctx={ctx}
                  perfumes={catalogue?.perfumes ?? []}
                  onAdd={(choice) => {
                    onOffCatalog(choice);
                    setQuery("");
                    onOpenChange(false);
                  }}
                  onPickExisting={(perfume) => ctx.select(String(perfume.id))}
                />
              ),
            }
          : undefined
      }
    />
  );
}

/** Marques connues du catalogue, une orthographe par clé de `cleNom`. */
function knownBrands(perfumes: readonly PickerPerfume[]): string[] {
  const seen = new Map<string, string>();
  for (const perfume of perfumes) {
    const key = cleNom(perfume.brandName);
    if (key && !seen.has(key)) seen.set(key, perfume.brandName);
  }
  return [...seen.values()];
}

/**
 * « lattafa khamrah » → marque « Lattafa » (connue) et nom « khamrah » : la recherche tapée devient le
 * sous-formulaire pré-rempli. Sans marque connue en tête, tout est le nom.
 */
export function splitOffCatalogQuery(query: string, brands: readonly string[]): { name: string; brand: string } {
  const words = query.trim().split(/\s+/).filter(Boolean);
  for (const brand of [...brands].sort((a, b) => b.length - a.length)) {
    const size = brand.trim().split(/\s+/).length;
    if (words.length > size && cleNom(words.slice(0, size).join(" ")) === cleNom(brand)) {
      return { name: words.slice(size).join(" "), brand };
    }
  }
  return { name: query.trim(), brand: "" };
}

/**
 * S05 zone 4 — article hors catalogue : nom (aperçu normalisé, `nommage.ts`), marque (rattachée à l'orthographe du
 * catalogue si elle existe, jamais créée par une vente), alerte « Déjà au catalogue » si le parfum existe. Sheet de
 * saisie courte : le bouton suit les champs.
 */
function OffCatalogForm({
  ctx,
  perfumes,
  onAdd,
  onPickExisting,
}: {
  ctx: SelectCreateContext<string>;
  perfumes: readonly PickerPerfume[];
  onAdd: (choice: OffCatalogChoice) => void;
  onPickExisting: (perfume: PickerPerfume) => void;
}) {
  const brands = useMemo(() => knownBrands(perfumes), [perfumes]);
  const [initial] = useState(() => splitOffCatalogQuery(ctx.query, brands));
  const [name, setName] = useState(initial.name);
  const [brand, setBrand] = useState(initial.brand);
  const [tried, setTried] = useState(false);

  const retainedName = normaliseParfum(name);
  const knownBrand = trouveParNom(brands, (b) => b, brand);
  const retainedBrand = knownBrand ?? (brand.trim() ? normaliseMarque(brand) : null);
  const suggestions =
    brand.trim() && !knownBrand ? brands.filter((b) => cleNom(b).includes(cleNom(brand))).slice(0, 4) : [];
  const duplicate = perfumes.find(
    (perfume) =>
      cleNom(retainedName) !== "" &&
      cleNom(perfume.name) === cleNom(retainedName) &&
      (retainedBrand === null || cleNom(perfume.brandName) === cleNom(retainedBrand)),
  );
  const tooShort = retainedName.trim().length < 2;

  const add = () => {
    setTried(true);
    if (tooShort) return;
    onAdd({ name: retainedName, brandName: retainedBrand });
  };

  return (
    <div className="flex flex-col gap-4" data-off-catalog-form>
      <FormField
        label="Nom du parfum"
        required
        error={tried && tooShort ? "Indique le nom du parfum (2 caractères au moins)." : undefined}
        hint={retainedName && retainedName !== name.trim() ? `Enregistré : ${retainedName}` : undefined}
      >
        {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" enterKeyHint="next" />}
      </FormField>
      <FormField
        label="Marque"
        hint={
          knownBrand
            ? knownBrand === brand.trim()
              ? `${knownBrand}, déjà au catalogue.`
              : `Rattaché à ${knownBrand}, déjà au catalogue.`
            : retainedBrand
              ? `Enregistrée : ${retainedBrand}`
              : "Facultatif"
        }
      >
        {(field) => <Input {...field} value={brand} onChange={(e) => setBrand(e.target.value)} autoComplete="off" enterKeyHint="done" />}
      </FormField>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Marques du catalogue">
          {suggestions.map((suggestion) => (
            <Chip key={suggestion} onClick={() => setBrand(suggestion)}>
              {suggestion}
            </Chip>
          ))}
        </div>
      ) : null}
      {duplicate ? (
        <div role="status" className="flex flex-col gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-3">
          <Text variant="caption" tone="warning" className="font-medium">
            Déjà au catalogue : {duplicate.name} ({duplicate.brandName})
          </Text>
          <Button variant="secondary" size="sm" onClick={() => onPickExisting(duplicate)}>
            Choisir celui-ci
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button variant={duplicate ? "secondary" : "primary"} fullWidth onClick={add}>
          Ajouter la ligne
        </Button>
        <Button variant="text" fullWidth onClick={ctx.cancel}>
          Revenir à la liste
        </Button>
      </div>
    </div>
  );
}

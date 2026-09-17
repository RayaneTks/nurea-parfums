"use client";

import { Info } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import type { AdminBrandRow } from "@/contracts/catalogue";
import { cleNom, normaliseMarque, trouveParNom } from "@/lib/nommage";
import { SelectSheet, type SelectOption } from "@/ui/patterns/SelectSheet";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { brandCaption } from "./BrandRow";
import { CatalogueThumb } from "./CatalogueThumb";

/** La marque d'une fiche parfum : une marque du catalogue, ou un nom à créer avec le parfum. */
export type BrandChoice =
  | { kind: "existing"; brand: Pick<AdminBrandRow, "id" | "name" | "status" | "catalogMode" | "image"> }
  | { kind: "new"; name: string };

const NEW_PREFIX = "nouvelle:";

type BrandSelectSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: readonly AdminBrandRow[];
  recentIds: readonly string[];
  value: BrandChoice | null;
  onSelect: (choice: BrandChoice) => void;
  /** Saisie conservée d'une ouverture à l'autre (F-4.5-09). */
  query: string;
  onQueryChange: (query: string) => void;
};

/** Notice `info` (jamais une bannière d'erreur) : la saisie désigne une marque déjà au catalogue. */
export function ExistingBrandNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      data-notice="info"
      className="admin-type-caption flex items-start gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-info-border)] bg-[var(--admin-info-bg)] px-3 py-2.5 font-medium text-[var(--admin-info)]"
    >
      <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

/**
 * S05 en mode marques (06 §3.7, depuis E19) : marques récentes, recherche sans accents, et
 * « Créer la marque « … » » SEULEMENT quand aucune marque équivalente n'existe (`cleNom`) — « louis vuitton »
 * désigne « Louis Vuitton », rattachée avec une notice, jamais dupliquée (02 §4.5).
 */
export function BrandSelectSheet({ open, onOpenChange, brands, recentIds, value, onSelect, query, onQueryChange }: BrandSelectSheetProps) {
  const byId = useMemo(() => new Map(brands.map((brand) => [brand.id, brand])), [brands]);
  const trimmed = query.trim();
  const twin = trimmed.length >= 2 ? trouveParNom(brands, (brand) => brand.name, trimmed) : undefined;
  const proposed = trimmed.length >= 2 ? normaliseMarque(trimmed) : "";

  const options = useMemo<SelectOption[]>(
    () =>
      brands.map((brand) => ({
        value: brand.id,
        label: brand.name,
        description: brandCaption(brand),
        keywords: [cleNom(brand.name)],
        leading: <CatalogueThumb src={brand.imageLight ?? brand.image} name={brand.name} size={40} />,
        trailing: brand.status === "DRAFT" ? <Badge>Masquée</Badge> : undefined,
      })),
    [brands],
  );

  const selectedValue = value?.kind === "existing" ? value.brand.id : value?.kind === "new" ? `${NEW_PREFIX}${value.name}` : null;

  return (
    <SelectSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Marque"
      options={options}
      value={selectedValue}
      recent={recentIds.filter((id) => byId.has(id))}
      recentTitle="Marques récentes"
      listAllBeforeSearch
      searchPlaceholder="Rechercher une marque"
      autoFocusSearch
      query={query}
      onQueryChange={onQueryChange}
      header={
        twin && twin.name !== trimmed ? (
          <ExistingBrandNotice>
            {twin.name} est déjà au catalogue : touche-la pour la choisir, aucune marque en double ne sera créée.
          </ExistingBrandNotice>
        ) : null
      }
      onSelect={(selected) => {
        if (selected.startsWith(NEW_PREFIX)) {
          onSelect({ kind: "new", name: selected.slice(NEW_PREFIX.length) });
          return;
        }
        const brand = byId.get(selected);
        if (brand) onSelect({ kind: "existing", brand });
      }}
      onCreate={
        twin || proposed.length < 2
          ? undefined
          : {
              label: () => `Créer la marque « ${proposed} »`,
              form: (ctx) => (
                <div className="flex flex-col gap-3">
                  <p className="admin-type-body text-[var(--admin-text)]">
                    Nouvelle marque : <span className="font-semibold">{proposed}</span>
                  </p>
                  <p className="admin-type-caption text-[var(--admin-text-muted)]">
                    Enregistrée avec le parfum, en Sélection et visible. Logo et réglages depuis sa fiche, plus tard.
                  </p>
                  <Button variant="primary" size="lg" fullWidth onClick={() => ctx.select(`${NEW_PREFIX}${proposed}`)}>
                    Utiliser cette marque
                  </Button>
                  <Button variant="ghost" fullWidth onClick={ctx.cancel}>
                    Revenir à la liste
                  </Button>
                </div>
              ),
            }
      }
      empty={{ title: (q) => (q ? `Aucune marque ne correspond à « ${q} »` : "Aucune marque au catalogue") }}
    />
  );
}

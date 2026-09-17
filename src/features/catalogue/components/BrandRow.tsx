"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminBrandRow } from "@/contracts/catalogue";
import type { PublicationStatus } from "@/domain/publication";
import { routes } from "@/app-shell/routes";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import { CatalogueThumb } from "./CatalogueThumb";
import { useBrandVisibility } from "./useBrandVisibility";

/** « Sélection · 14 parfums » ou « Gamme complète » (06 E15 zone 4). */
export function brandCaption(brand: Pick<AdminBrandRow, "catalogMode" | "perfumeCount">): string {
  if (brand.catalogMode === "COMPLETE") return "Gamme complète";
  return `Sélection · ${brand.perfumeCount} parfum${brand.perfumeCount > 1 ? "s" : ""}`;
}

/**
 * Ligne de marque (06 E15 zone 4) : logo aux proportions d'origine, nom, légende, œil de visibilité.
 * Masquer une marque qui a des parfums visibles demande confirmation (T14, texte du serveur).
 */
export function BrandRow({ brand }: { brand: AdminBrandRow }) {
  const [optimistic, setOptimistic] = useState<PublicationStatus | null>(null);
  const status = optimistic ?? brand.status;
  const visible = status === "PUBLISHED";
  const { setVisibility, pending } = useBrandVisibility();

  useEffect(() => setOptimistic(null), [brand.status]);

  const toggle = async () => {
    if (pending) return;
    const next: PublicationStatus = visible ? "DRAFT" : "PUBLISHED";
    setOptimistic(next);
    const written = await setVisibility(brand, next);
    if (!written) setOptimistic(null);
  };

  return (
    <ListRow
      href={routes.modifierMarque(brand.id)}
      ariaLabel={`${brand.name}${visible ? "" : ", masquée"}`}
      leading={<CatalogueThumb src={brand.imageLight ?? brand.image} name={brand.name} muted={!visible} />}
      primary={
        <span
          className={cn(
            "admin-type-body block truncate font-medium",
            visible ? "text-[var(--admin-text)]" : "text-[var(--admin-text-muted)]",
          )}
        >
          {brand.name}
        </span>
      }
      secondary={brandCaption(brand)}
      trailing={
        <Button
          variant="ghost"
          iconOnly
          ariaLabel={visible ? `Masquer ${brand.name}` : `Rendre ${brand.name} visible`}
          aria-pressed={visible}
          data-visibility-toggle
          onClick={() => void toggle()}
          className={visible ? "text-[var(--admin-accent)]" : "text-[var(--admin-text-subtle)]"}
        >
          {visible ? <Eye size={20} /> : <EyeOff size={20} />}
        </Button>
      }
    />
  );
}

"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminBrandRow } from "@/contracts/catalogue";
import type { PublicationStatus } from "@/domain/publication";
import { routes } from "@/app-shell/routes";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import { CatalogueThumb } from "./CatalogueThumb";
import { useBrandVisibility } from "./useBrandVisibility";

/** « 14 références » sous le nom de la marque. */
export function brandCaption(brand: Pick<AdminBrandRow, "perfumeCount">): string {
  return `${brand.perfumeCount} référence${brand.perfumeCount > 1 ? "s" : ""}`;
}

/**
 * Ligne de marque (06 E15 zone 4) : visuel aux proportions d'origine, nom, légende. Une marque MASQUÉE porte
 * l'œil barré : 1 tap la rend visible. Une marque visible ne porte rien ; on la masque depuis sa fiche
 * (confirmation T14 quand elle a des parfums visibles).
 */
export function BrandRow({ brand }: { brand: AdminBrandRow }) {
  const [optimistic, setOptimistic] = useState<PublicationStatus | null>(null);
  const status = optimistic ?? brand.status;
  const visible = status === "PUBLISHED";
  const { setVisibility, pending } = useBrandVisibility();

  useEffect(() => setOptimistic(null), [brand.status]);

  const publish = async () => {
    if (pending) return;
    setOptimistic("PUBLISHED");
    const written = await setVisibility(brand, "PUBLISHED");
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
        visible ? null : (
          <Button
            variant="ghost"
            iconOnly
            ariaLabel={`Rendre ${brand.name} visible`}
            data-visibility-toggle
            onClick={() => void publish()}
            className="text-[var(--admin-text-subtle)]"
          >
            <EyeOff size={20} />
          </Button>
        )
      }
    />
  );
}

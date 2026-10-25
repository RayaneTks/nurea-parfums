"use client";

import { EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminPerfumeRow } from "@/contracts/catalogue";
import type { PublicationStatus } from "@/domain/publication";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import { setPerfumeStatusAction } from "@/server/catalogue/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import { storyCountLabel } from "./catalogue-model";
import { CatalogueThumb } from "./CatalogueThumb";

/**
 * Ligne de parfum (06 E15 zone 3) : vignette, nom (+ « Rupture » ou « Stock bas » si le stock est suivi),
 * légende marque (+ « · gamme », « · 2 visuels story »). Un parfum MASQUÉ porte l'œil barré : 1 tap le rend
 * visible, optimiste, restauré avec la raison du refus en toast (message unique de `src/domain/publication.ts`,
 * renvoyé par le serveur). Un parfum visible ne porte rien (25/10/2026 : un œil sur 100 % des lignes ne dit
 * rien) ; on le masque depuis sa fiche.
 */
export function PerfumeRow({ perfume }: { perfume: AdminPerfumeRow }) {
  const [optimistic, setOptimistic] = useState<PublicationStatus | null>(null);
  const status = optimistic ?? perfume.status;
  const visible = status === "PUBLISHED";
  // L'œil disparaît une fois le parfum visible : le toast confirme.
  const { run, pending } = useAction(setPerfumeStatusAction, { success: `${perfume.name} est visible sur la vitrine` });

  // La vérité revient du serveur : dès que la prop change, elle fait foi.
  useEffect(() => setOptimistic(null), [perfume.status]);

  const publish = async () => {
    if (pending) return;
    setOptimistic("PUBLISHED");
    const result = await run({ id: perfume.id, status: "PUBLISHED" });
    if (!result.ok) setOptimistic(null);
  };

  const badge =
    perfume.stockStatus === "out" ? (
      <Badge tone="danger">Rupture</Badge>
    ) : perfume.stockStatus === "low" ? (
      <Badge tone="warning">Stock bas</Badge>
    ) : null;

  return (
    <ListRow
      href={routes.parfum(perfume.id)}
      ariaLabel={`${perfume.name}, ${perfume.brand.name}${visible ? "" : ", masqué"}`}
      leading={<CatalogueThumb src={perfume.imageLight ?? perfume.image} name={perfume.name} muted={!visible} />}
      primary={
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "admin-type-body min-w-0 truncate font-medium",
              visible ? "text-[var(--admin-text)]" : "text-[var(--admin-text-muted)]",
            )}
          >
            {perfume.name}
          </span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </span>
      }
      secondary={[perfume.brand.name, perfume.line, perfume.mediaCount > 0 ? storyCountLabel(perfume.mediaCount) : null]
        .filter(Boolean)
        .join(" · ")}
      trailing={
        visible ? null : (
          <Button
            variant="ghost"
            iconOnly
            ariaLabel={`Rendre ${perfume.name} visible`}
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

"use client";

import { Eye, EyeOff } from "lucide-react";
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
 * légende marque (+ « · 2 visuels story »), et l'œil de visibilité — 1 tap, optimiste, restauré avec la
 * raison du refus en toast (message unique de `src/domain/publication.ts`, renvoyé par le serveur).
 */
export function PerfumeRow({ perfume }: { perfume: AdminPerfumeRow }) {
  const [optimistic, setOptimistic] = useState<PublicationStatus | null>(null);
  const status = optimistic ?? perfume.status;
  const visible = status === "PUBLISHED";
  // Pas de toast de succès : l'œil qui change EST la confirmation ; seul un refus parle.
  const { run, pending } = useAction(setPerfumeStatusAction);

  // La vérité revient du serveur : dès que la prop change, elle fait foi.
  useEffect(() => setOptimistic(null), [perfume.status]);

  const toggle = async () => {
    if (pending) return;
    const next: PublicationStatus = visible ? "DRAFT" : "PUBLISHED";
    setOptimistic(next);
    const result = await run({ id: perfume.id, status: next });
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
      secondary={perfume.mediaCount > 0 ? `${perfume.brand.name} · ${storyCountLabel(perfume.mediaCount)}` : perfume.brand.name}
      trailing={
        <Button
          variant="ghost"
          iconOnly
          ariaLabel={visible ? `Masquer ${perfume.name}` : `Rendre ${perfume.name} visible`}
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

"use client";

import { Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AdminPerfumeRow } from "@/contracts/catalogue";
import { canFeaturePerfume, FEATURED_LIMIT } from "@/domain/publication";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { setPerfumeFeaturedAction } from "@/server/catalogue/actions";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { WindowedList } from "@/ui/primitives/WindowedList";
import { CatalogueThumb } from "./CatalogueThumb";

type FeaturedPanelProps = {
  perfumes: readonly AdminPerfumeRow[];
  /** Candidats filtrés par la recherche. */
  words: readonly string[];
  onClearSearch: () => void;
};

/**
 * « En avant » (06 E15 zone 5) : deux emplacements matérialisés, puis les candidats — parfums VISIBLES
 * uniquement (un parfum masqué n'occupe jamais un emplacement, 01 §4.5). Tap = mettre en avant ;
 * au-delà de deux, le refus du domaine en toast, sans aller-retour.
 */
export function FeaturedPanel({ perfumes, words, onClearSearch }: FeaturedPanelProps) {
  const { showToast } = useToast();
  const [optimistic, setOptimistic] = useState<ReadonlyMap<number, boolean>>(new Map());
  const { run } = useAction(setPerfumeFeaturedAction, {
    success: (data) => (data.isFeatured ? `${data.name} mis en avant` : `${data.name} retiré de la mise en avant`),
  });

  // Les props du serveur font foi dès qu'elles changent.
  useEffect(() => setOptimistic(new Map()), [perfumes]);

  const isFeatured = (perfume: AdminPerfumeRow) => optimistic.get(perfume.id) ?? perfume.isFeatured;
  const featured = perfumes.filter(isFeatured);
  const candidates = useMemo(
    () =>
      perfumes.filter(
        (perfume) =>
          perfume.status === "PUBLISHED" &&
          !(optimistic.get(perfume.id) ?? perfume.isFeatured) &&
          words.every((word) => perfume.searchKey.includes(word)),
      ),
    [perfumes, optimistic, words],
  );

  const toggle = async (perfume: AdminPerfumeRow, next: boolean) => {
    if (next) {
      const verdict = canFeaturePerfume(perfume, featured.length);
      if (!verdict.ok) {
        showToast({ type: "error", message: verdict.message });
        return;
      }
    }
    setOptimistic((previous) => new Map(previous).set(perfume.id, next));
    const result = await run({ id: perfume.id, featured: next });
    if (!result.ok) {
      setOptimistic((previous) => {
        const copy = new Map(previous);
        copy.delete(perfume.id);
        return copy;
      });
    }
  };

  const slots = Array.from({ length: FEATURED_LIMIT }, (_, index) => featured[index] ?? null);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-label="Emplacements de la vitrine">
        <SectionHeader level={2} title={`Sur la vitrine · ${featured.length}/${FEATURED_LIMIT}`} />
        {slots.map((perfume, index) =>
          perfume ? (
            <Card key={perfume.id} padding={0} className="border-[var(--admin-accent)]">
              <ListRow
                leading={<CatalogueThumb src={perfume.imageLight ?? perfume.image} name={perfume.name} />}
                primary={perfume.name}
                secondary={perfume.brand.name}
                trailing={
                  <Button variant="text" size="sm" onClick={() => void toggle(perfume, false)} ariaLabel={`Retirer ${perfume.name} de la vitrine`}>
                    Retirer
                  </Button>
                }
              />
            </Card>
          ) : (
            <div
              key={`libre-${index}`}
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-[var(--admin-radius-lg)] border border-dashed border-[var(--admin-border-strong)] px-3"
            >
              <Star size={16} aria-hidden className="text-[var(--admin-text-subtle)]" />
              <span className="admin-type-caption text-[var(--admin-text-muted)]">Emplacement libre</span>
            </div>
          ),
        )}
      </section>

      <section className="flex flex-col gap-2" aria-label="Parfums à mettre en avant">
        <SectionHeader
          level={2}
          title="Parfums visibles"
          description={featured.length >= FEATURED_LIMIT ? "Retire un parfum pour en mettre un autre en avant." : "Touche un parfum pour le mettre en avant."}
        />
        {candidates.length === 0 ? (
          words.length > 0 ? (
            <EmptyState
              title="Aucun parfum ne correspond"
              action={
                <Button variant="secondary" onClick={onClearSearch}>
                  Effacer la recherche
                </Button>
              }
            />
          ) : (
            <EmptyState done title="Aucun autre parfum visible à mettre en avant." />
          )
        ) : (
          <Card padding={0}>
            <WindowedList
              items={candidates}
              itemKey={(perfume) => perfume.id}
              estimateSize={57}
              gap={0}
              aria-label="Parfums visibles"
              renderItem={(perfume, index) => (
                <div className={index > 0 ? "border-t border-[var(--admin-border)]" : undefined}>
                  <ListRow
                    onClick={() => void toggle(perfume, true)}
                    ariaLabel={`Mettre ${perfume.name} en avant`}
                    leading={<CatalogueThumb src={perfume.imageLight ?? perfume.image} name={perfume.name} />}
                    primary={perfume.name}
                    secondary={perfume.brand.name}
                    trailing={<Star size={18} aria-hidden className="text-[var(--admin-accent)]" />}
                  />
                </div>
              )}
            />
          </Card>
        )}
      </section>
    </div>
  );
}

import type { ReactNode } from "react";
import type { TopPerfumeDTO, TopPerfumesDTO } from "@/contracts/stats";
import { CatalogueThumb } from "@/features/catalogue/components/CatalogueThumb";
import { ListSection } from "@/ui/patterns/ListSection";
import { Badge } from "@/ui/primitives/Badge";
import { ListRow } from "@/ui/primitives/ListRow";
import { barWidth, maxUnits, unitsLabel } from "./home-model";

/**
 * Rang et vignette d'une ligne : le numéro de rang (chiffres tabulaires, largeur fixe pour que les noms
 * s'alignent) et la vignette du catalogue (`CatalogueThumb` : image contenue, jamais rognée).
 */
function Rank({ rank, image, name }: { rank: number; image: string | null; name: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="admin-type-caption tnum w-4 text-right font-semibold text-[var(--admin-text-subtle)]" aria-hidden>
        {rank}
      </span>
      <CatalogueThumb src={image} name={name} size={40} />
      <span className="sr-only">{`Rang ${rank}`}</span>
    </span>
  );
}

/** Barre proportionnelle sous la ligne (06 E07) : elle compare les lignes entre elles, décorative. */
function Bar({ percent }: { percent: number }) {
  return (
    <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-[var(--admin-surface-muted)]" aria-hidden>
      <span className="block h-full rounded-full bg-[var(--admin-accent)]" style={{ width: `${percent}%` }} />
    </span>
  );
}

type ClassementRowsProps = {
  entries: readonly TopPerfumeDTO[];
  /** `null` pour une ligne hors catalogue ou dont le parfum a disparu : elle n'ouvre rien. */
  hrefOf: (perfumeId: number) => string;
  /** Barres proportionnelles : E07 les rend, le bloc de l'Accueil s'en passe (5 lignes, pas un classement). */
  bars: boolean;
  max: number;
};

function ClassementRows({ entries, hrefOf, bars, max }: ClassementRowsProps) {
  return (
    <>
      {entries.map((entry) => {
        const units = unitsLabel(entry.units);
        const trailing = <span className="admin-type-body-em tnum whitespace-nowrap">{units}</span>;
        const primary = (
          <>
            <span className="admin-type-body block truncate font-medium text-[var(--admin-text)]">{entry.name}</span>
            <span className="admin-type-caption mt-0.5 flex min-w-0 items-center gap-1.5 text-[var(--admin-text-muted)]">
              <span className="truncate">{entry.brandName ?? "Sans marque"}</span>
              {entry.isOffCatalog ? <Badge tone="neutral">Hors catalogue</Badge> : null}
            </span>
            {bars ? <Bar percent={barWidth(entry.units, max)} /> : null}
          </>
        );
        const leading = <Rank rank={entry.rank} image={entry.image} name={entry.name} />;
        return (
          <div key={entry.key} data-classement-row={entry.key}>
            {entry.perfumeId !== null ? (
              <ListRow
                href={hrefOf(entry.perfumeId)}
                leading={leading}
                primary={primary}
                trailing={trailing}
                ariaLabel={`${entry.name} · ${units}`}
              />
            ) : (
              <ListRow leading={leading} primary={primary} trailing={trailing} />
            )}
          </div>
        );
      })}
    </>
  );
}

/**
 * E01 zone 8 — « Top parfums · (mois) », 5 lignes. L'en-tête EST le lien « Tout le classement » vers E07
 * (05 §3.2 `ListSection href`). Le bloc est absent s'il n'y a eu aucune vente ce mois-ci (06 E01) : c'est la
 * page qui ne le rend pas.
 */
export function TopPerfumes({
  entries,
  title,
  statsHref,
  hrefOf,
}: {
  entries: readonly TopPerfumeDTO[];
  title: string;
  statsHref: string;
  hrefOf: (perfumeId: number) => string;
}) {
  if (entries.length === 0) return null;
  return (
    <section data-top-perfumes>
      <ListSection title={title} href={statsHref}>
        <ClassementRows entries={entries} hrefOf={hrefOf} bars={false} max={maxUnits(entries)} />
      </ListSection>
    </section>
  );
}

/**
 * E07 — le classement complet d'une période : rang, vignette, nom, marque, badge « Hors catalogue », unités
 * et barre proportionnelle. « Afficher plus » est rendu par la page (il écrit `pages` dans l'URL).
 */
export function Classement({
  data,
  hrefOf,
  footer,
}: {
  data: TopPerfumesDTO;
  hrefOf: (perfumeId: number) => string;
  footer?: ReactNode;
}) {
  return (
    <div data-classement>
      <ListSection title="Classement" count={data.totalEntries} footer={footer}>
        <ClassementRows entries={data.entries} hrefOf={hrefOf} bars max={maxUnits(data.entries)} />
      </ListSection>
    </div>
  );
}

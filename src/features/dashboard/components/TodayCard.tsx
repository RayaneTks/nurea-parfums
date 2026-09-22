import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { TodayDTO } from "@/contracts/stats";
import { Money } from "@/ui/patterns/Money";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";
import { hasToday, plural, todayCaption } from "./home-model";

type TodayCardProps = {
  today: TodayDTO;
  /** « jeudi 17 septembre » : écrit par la page (même texte au serveur et sur l'iPhone). */
  dateLabel: string;
  /** E02, et les deux filtres de la liste Commandes — fabriqués par la page (`routes.ts`). */
  recapHref: string;
  todayHref: string;
  tomorrowHref: string;
};

/**
 * E01 zone 4 — « Aujourd'hui · jeudi 17 septembre › ». Le bilan du jour se LIT à 0 tap, et son en-tête ouvre
 * le récap détaillé en 1 tap (PC-09). Les deux rangées de livraison sont masquées à 0.
 *
 * La carte, elle, **reste** même sur une journée sans rien : elle est la SEULE porte vers E02 (amendement
 * J14-10 de 07). Un matin sans vente, elle n'affiche pas « 0 € » — elle dit « Rien encore aujourd'hui. » et
 * garde son chevron. C'est la lettre de 05 §5.3 (« une tuile à zéro sans enjeu disparaît ») sans en trahir
 * l'esprit : ici le zéro a un enjeu, c'est le chemin du récap.
 *
 * Les deux rangées ouvrent exactement les sections « aujourdhui » et « demain » de la liste Commandes : le
 * compteur et l'écran ouvert emploient la même expression SQL (`accueilComptesSql`).
 */
export function TodayCard({ today, dateLabel, recapHref, todayHref, tomorrowHref }: TodayCardProps) {
  const somethingHappened = hasToday(today);
  const caption = todayCaption(today);

  return (
    <section aria-label={`Aujourd'hui · ${dateLabel}`} data-today-block>
      <Card padding={0}>
        <Link
          href={recapHref}
          prefetch
          className="tap-scale flex min-h-[var(--admin-touch-min)] flex-col gap-0.5 p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)] active:bg-[var(--admin-surface-alt)] mouse-hover:bg-[var(--admin-surface-alt)]"
        >
          <span className="flex items-center justify-between gap-2">
            <Text variant="micro" tone="subtle" uppercase>
              {`Aujourd'hui · ${dateLabel}`}
            </Text>
            <ChevronRight size={14} aria-hidden className="shrink-0 text-[var(--admin-text-subtle)]" />
          </span>
          {somethingHappened ? (
            <>
              <span className="admin-type-h2 block truncate">
                <Money value={today.encaisse} compact />
              </span>
              <span className="admin-type-caption block truncate text-[var(--admin-text-muted)]">
                {caption ?? "Encaissé aujourd'hui"}
              </span>
            </>
          ) : (
            <span className="admin-type-body block truncate text-[var(--admin-text-muted)]">Rien encore aujourd&apos;hui.</span>
          )}
        </Link>

        {today.aLivrerAujourdhui > 0 ? (
          <>
            <Divider />
            <ListRow
              href={todayHref}
              primary="À livrer aujourd'hui"
              chevron
              trailing={<span className="admin-type-body-em tnum">{today.aLivrerAujourdhui}</span>}
              ariaLabel={`À livrer aujourd'hui : ${plural(today.aLivrerAujourdhui, "commande")}`}
            />
          </>
        ) : null}
        {today.aLivrerDemain > 0 ? (
          <>
            <Divider />
            <ListRow
              href={tomorrowHref}
              primary="À livrer demain"
              chevron
              trailing={<span className="admin-type-body-em tnum">{today.aLivrerDemain}</span>}
              ariaLabel={`À livrer demain : ${plural(today.aLivrerDemain, "commande")}`}
            />
          </>
        ) : null}
      </Card>
    </section>
  );
}

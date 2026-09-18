"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { withSheet } from "@/app-shell/routes";
import type { DayRecapDTO } from "@/contracts/stats";
import { eur, eurFromWire, type MoneyString } from "@/domain/money";
import { useToast } from "@/app-shell/FeedbackProvider";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { ShareButton } from "@/ui/patterns/ShareButton";
import { formatDate } from "@/ui/patterns/date-format";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Text } from "@/ui/primitives/Text";
import { cn } from "@/lib/utils";
import { customerLabel, dayDocumentCaption, plural, shareRecapText } from "./home-model";

const isZero = (value: MoneyString) => eur.isZero(eurFromWire(value));

type DayRecapProps = {
  recap: DayRecapDTO;
  /** Créances anciennes groupées par client (même ensemble que l'alerte de E01, 03 §5.8). */
  relances: { clients: { key: string; name: string; total: MoneyString; href: string | null }[]; total: MoneyString };
  /** Adresses fabriquées par la page : jours voisins, fiche d'un document. */
  previousHref: string;
  nextHref: string | null;
  /**
   * URL du récap affiché, sur laquelle s'ajoute `?doc=` : la fiche s'ouvre AU-DESSUS du récap (A-3), on ne
   * quitte pas l'écran. Une chaîne, pas une fonction : un composant client ne reçoit pas de fonction d'un
   * composant serveur.
   */
  sheetBase: string;
  now?: Date;
};

/** Flèche du navigateur de date : 44 px, désactivée (et non masquée) quand il n'y a rien à lire au-delà. */
function DayArrow({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const shape = "flex h-11 w-11 items-center justify-center rounded-[var(--admin-radius-md)]";
  if (!href) {
    return (
      <span className={cn(shape, "text-[var(--admin-text-subtle)] opacity-40")} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      prefetch
      aria-label={label}
      className={cn(
        shape,
        "tap-scale text-[var(--admin-text-muted)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
        "active:bg-[var(--admin-surface-alt)] mouse-hover:bg-[var(--admin-surface-alt)]",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * E02 — Récap du jour (06 E02). Le bilan d'une journée : navigateur de date, Encaissé du jour par poche,
 * documents du jour, livraisons du lendemain, clients à relancer. Une seule action : « Partager le récap ».
 *
 * L'Encaissé et sa ventilation sont les chiffres canoniques du jour (`encaisse`, `encaisseParPoche`) : le
 * total EST la somme des poches, par construction, jamais par une addition faite à l'écran (04 §6.1).
 *
 * Une journée sans rien se dit en une ligne calme, sans bouton (05 §5.1) — et « Partager le récap »
 * disparaît : il n'y a rien à partager.
 */
export function DayRecap({ recap, relances, previousHref, nextHref, sheetBase, now = new Date() }: DayRecapProps) {
  const { showToast } = useToast();
  const date = new Date(`${recap.jour}T12:00:00Z`);
  const dateLabel = formatDate(date, "long", now);
  const pockets = recap.parPoche.filter((poche) => !isZero(poche.encaisse));
  const docHrefOf = (documentId: string) => withSheet(sheetBase, { doc: documentId });

  return (
    <div className="flex flex-col gap-4" data-day-recap>
      {/* 1 — Navigateur de date : « ‹ jeudi 17 septembre › », « › » désactivé sur aujourd'hui. */}
      <div className="flex items-center justify-between gap-2">
        <DayArrow href={previousHref} label="Jour précédent">
          <ChevronLeft size={20} aria-hidden />
        </DayArrow>
        <h1 className="admin-type-h3 min-w-0 flex-1 truncate text-center first-letter:uppercase">{dateLabel}</h1>
        <DayArrow href={nextHref} label="Jour suivant">
          <ChevronRight size={20} aria-hidden />
        </DayArrow>
      </div>

      {recap.isEmpty && isZero(recap.encaisse) ? (
        <EmptyState done title="Rien d'enregistré ce jour-là." />
      ) : (
        <>
          {/* 2 — Encaissé du jour, remboursements déduits, et une ligne par poche. */}
          <section className="flex flex-col gap-3" aria-label={`Encaissé · ${dateLabel}`} data-day-figures>
            <div className="flex flex-col gap-0.5">
              <Text variant="micro" tone="subtle" uppercase>
                Encaissé
              </Text>
              <Money value={recap.encaisse} bold className="admin-type-display" />
            </div>
            {pockets.length > 0 ? (
              <Card padding={0}>
                {pockets.map((poche, index) => (
                  <div key={poche.pocketId}>
                    {index > 0 ? <Divider /> : null}
                    <ListRow primary={poche.name} trailing={<Money value={poche.encaisse} />} />
                  </div>
                ))}
              </Card>
            ) : null}
          </section>

          {/* 3 — Documents du jour : ventes, commandes prises, commandes livrées. */}
          {recap.documents.length > 0 ? (
            <ListSection title="Documents du jour" count={recap.documents.length}>
              {recap.documents.map((doc) => (
                <div key={doc.documentId} data-day-document={doc.documentId}>
                  <ListRow
                    href={docHrefOf(doc.documentId)}
                    primary={customerLabel(doc.customerName)}
                    secondary={dayDocumentCaption(doc.kind, doc.itemCount)}
                    trailing={isZero(doc.due) ? <Money value={doc.total} /> : <Money value={doc.due} tone="warning" bold />}
                  />
                </div>
              ))}
            </ListSection>
          ) : null}

          {/* 4 — À livrer le lendemain. */}
          {recap.demain.length > 0 ? (
            <ListSection title="À livrer le lendemain" count={recap.demain.length}>
              {recap.demain.map((order) => (
                <ListRow
                  key={order.documentId}
                  href={docHrefOf(order.documentId)}
                  primary={customerLabel(order.customerName)}
                  secondary={
                    order.hasTime ? formatDate(new Date(order.expectedDeliveryAt), "datetime", now) : "Sans heure"
                  }
                  trailing={isZero(order.due) ? <Money value={order.total} /> : <Money value={order.due} tone="warning" bold />}
                />
              ))}
            </ListSection>
          ) : null}

          {/* 5 — À relancer : les mêmes clients que l'alerte de l'Accueil (03 §5.8). */}
          {relances.clients.length > 0 ? (
            <ListSection
              title="À relancer"
              count={relances.clients.length}
              amount={relances.total}
              amountTone="warning"
              description={`Créances de plus de 30 j · ${plural(relances.clients.length, "client")}`}
            >
              {relances.clients.map((client) =>
                client.href ? (
                  <ListRow key={client.key} href={client.href} primary={client.name} trailing={<Money value={client.total} tone="warning" bold />} />
                ) : (
                  <ListRow key={client.key} primary={client.name} trailing={<Money value={client.total} tone="warning" bold />} />
                ),
              )}
            </ListSection>
          ) : null}

          <StickyAction>
            <ShareButton
              fullWidth
              label="Partager le récap"
              payload={{
                title: `Récap du ${dateLabel}`,
                text: shareRecapText({
                  dateLabel,
                  recap,
                  relances: { clients: relances.clients.length, total: relances.total },
                }),
              }}
              onFeedback={(message, type) => showToast({ type, message })}
            />
          </StickyAction>
        </>
      )}
    </div>
  );
}

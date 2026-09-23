"use client";

import { HandCoins } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { routes } from "@/app-shell/routes";
import type { CustomersListDTO } from "@/contracts/customers";
import { eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import { usePendingRemovals } from "@/features/catalogue/components/pending-removals";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Avatar } from "@/ui/primitives/Avatar";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { SearchField } from "@/ui/primitives/SearchField";
import { scrollFieldIntoView } from "@/ui/primitives/field-behavior";
import { customersCountLabel, documentsCountLabel, isPositive, sectionsByLetter } from "./customers-model";
import { SECRET_ATTRIBUTE } from "@/contracts/discretion";
import { NomClient } from "@/ui/patterns/NomClient";

const SEARCH_DEBOUNCE_MS = 200;

type CustomersViewProps = {
  data: CustomersListDTO;
  /** `aEncaisser()` : la rangée de tête, même chiffre que l'écran À encaisser. */
  receivableTotal: MoneyString;
  /** Documents que somme ce total (`aEncaisserDetail().length`). */
  receivableCount: number;
};

/**
 * E12 — Clients (06 E12) : rangée « À encaisser » vers E13, recherche nom / téléphone / Snap / WhatsApp écrite dans
 * l'URL (200 ms, repart de la première page), liste A–Z avec badge « 80 € dû », compteur total, « Afficher plus »
 * qui AJOUTE une page (01 §4.10 : « Charger plus » remplaçait la liste).
 */
export function CustomersView({ data, receivableTotal, receivableCount }: CustomersViewProps) {
  const url = useUrlState();
  const router = useRouter();
  const removals = usePendingRemovals();
  const setUrl = url.set;

  // Saisie locale, écrite dans l'URL après 200 ms, sans `pages` : une recherche repart toujours de la première page.
  const [query, setQuery] = useState(data.q);
  const sent = useRef(data.q);
  useEffect(() => {
    if (data.q !== sent.current) {
      sent.current = data.q;
      setQuery(data.q);
    }
  }, [data.q]);
  useEffect(() => {
    const next = query.trim();
    if (next === sent.current) return;
    const timer = window.setTimeout(() => {
      sent.current = next;
      setUrl({ q: next || null, pages: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, setUrl]);

  const rows = useMemo(() => data.rows.filter((row) => !removals.has(`client:${row.id}`)), [data.rows, removals]);
  const sections = useMemo(() => sectionsByLetter(rows), [rows]);
  const hidden = data.rows.length - rows.length;

  const clear = () => {
    sent.current = "";
    setQuery("");
    setUrl({ q: null, pages: null });
  };

  return (
    <div className="flex flex-col gap-4" data-customers-view>
      {isPositive(receivableTotal) ? (
        <Card padding={0}>
          <ListRow
            href={routes.encaisser()}
            leading={<HandCoins size={20} aria-hidden className="text-[var(--admin-warning)]" />}
            primary="À encaisser"
            secondary={documentsCountLabel(receivableCount)}
            trailing={<Money value={receivableTotal} tone="warning" bold className="admin-type-body-em" />}
            chevron
            ariaLabel={`À encaisser, ${formatEur(eurFromWire(receivableTotal))}, ${documentsCountLabel(receivableCount)}`}
          />
        </Card>
      ) : null}

      {data.all > 0 ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Nom, téléphone, Snap, WhatsApp"
          ariaLabel="Rechercher un client"
          onFocus={scrollFieldIntoView}
        />
      ) : null}

      <div className={url.pending ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4"} aria-busy={url.pending || undefined}>
        {data.all === 0 ? (
          <EmptyState done title="Aucun client pour l'instant : « Nouveau » crée la première fiche." />
        ) : rows.length === 0 && data.q ? (
          <EmptyState
            title={`Aucun client ne correspond à « ${data.q} »`}
            description="La recherche couvre le nom, le téléphone, le Snap et le WhatsApp."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" onClick={() => router.push(routes.nouveauClient({ nom: data.q }))}>
                  Créer « {data.q} »
                </Button>
                <Button variant="text" onClick={clear}>
                  Effacer
                </Button>
              </div>
            }
          />
        ) : (
          <>
            <p className="admin-type-caption tnum px-1 text-[var(--admin-text-muted)]" data-customers-count>
              {customersCountLabel(data.total - hidden)}
            </p>
            {sections.map((section) => (
              <ListSection key={section.letter} title={section.letter}>
                {section.rows.map((row) => (
                  <div key={row.id} data-customer-row={row.id}>
                    <ListRow
                      href={routes.client(row.id)}
                      leading={<Avatar name={row.fullName} size="md" />}
                      primary={<NomClient>{row.fullName}</NomClient>}
                      secondary={row.contact ?? undefined}
                      trailing={
                        row.due ? (
                          <Badge tone="warning" size="md">
                            {/* Montant écrit dans une chaîne : il porte sa propre marque (mode discret). */}
                            <span {...{ [SECRET_ATTRIBUTE]: "" }}>{`${formatEur(eurFromWire(row.due), { compact: true })} dû`}</span>
                          </Badge>
                        ) : undefined
                      }
                    />
                  </div>
                ))}
              </ListSection>
            ))}
            {data.hasMore ? (
              <Button variant="secondary" fullWidth isLoading={url.pending} onClick={() => setUrl({ pages: data.pages + 1 })}>
                Afficher plus
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { FirstRunDTO } from "@/contracts/stats";
import { NEWS_SEEN_KEY, firstRunDone } from "@/contracts/stats";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { ListRow } from "@/ui/primitives/ListRow";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { Text } from "@/ui/primitives/Text";

/**
 * E01 zone 2 — la carte contextuelle, UNE seule à la fois, par priorité (06 E01) :
 *
 *  1. « Nouveautés » — les changements d'habitude tranchés le 17/09/2026 (00-README « Décisions qui
 *     changent le quotidien du gérant »). Affichée jusqu'à « J'ai compris », puis plus jamais.
 *  2. « Pour commencer » — le vide de départ (PC-12) : trois étapes cochées automatiquement.
 *
 * Fermeture mémorisée sur L'APPAREIL (`localStorage`) : elle ne concerne que ce téléphone, jamais la base
 * (rien à écrire côté serveur pour un accusé de lecture).
 *
 * La carte n'est rendue qu'après le montage : le serveur ne sait pas ce que cet appareil a déjà fermé, et
 * rendre puis retirer ferait clignoter l'écran le plus lu de l'app.
 */

const NEWS_KEY = NEWS_SEEN_KEY;

/** Les cinq changements d'habitude, dans l'ordre où ils se rencontrent (00-README, décisions 1, 2, 4, 5, 6). */
const NEWS: readonly string[] = [
  "Cinq onglets : Clients a le sien, et « À encaisser » est dedans.",
  "La compta, la Trésorerie et les lots s'ouvrent en touchant tes chiffres ci-dessous.",
  "Vente et commande : même écran, bascule en haut — plus de re-saisie.",
  "À la vente, tu saisis « Reçu maintenant » : le reste dû se calcule.",
  "Un stock laissé vide n'est plus une rupture, il est « non suivi ».",
  "Chaque chiffre a une seule définition : « en retard » dès le jour dépassé, Marge nette toujours après dépenses.",
];

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    // Navigation privée, stockage refusé : la carte se réaffichera, ce qui est sans gravité.
    return false;
  }
}

function writeDismissed(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* rien à faire : la fermeture vaut pour cette session */
  }
}

type ContextCardsProps = {
  state: FirstRunDTO;
  /** Adresses des trois étapes de « Pour commencer », fabriquées par la page (`routes.ts`). */
  steps: { pockets: string; perfume: string; sale: string };
};

export function ContextCards({ state, steps }: ContextCardsProps) {
  const [mounted, setMounted] = useState(false);
  const [newsSeen, setNewsSeen] = useState(true);

  useEffect(() => {
    setNewsSeen(readDismissed(NEWS_KEY));
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!newsSeen) {
    // Le marqueur de test vit sur une balise DOM : les props des briques de `src/ui` sont typées et fermées,
    // un `data-*` posé sur `<Card>` serait silencieusement perdu (TypeScript ne contrôle pas un attribut JSX
    // à trait d'union).
    return (
      <section aria-label="Nouveautés" data-card="nouveautes">
        <Card tone="accent" padding={4} className="flex flex-col gap-3">
          <SectionHeader level={2} title="Nouveautés" description="Ce qui change dans tes habitudes." />
          <ul className="flex flex-col gap-2">
            {NEWS.map((line) => (
              <li key={line} className="admin-type-body flex gap-2 text-[var(--admin-text)]">
                <span aria-hidden className="mt-[0.4em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--admin-accent)]" />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              writeDismissed(NEWS_KEY);
              setNewsSeen(true);
            }}
          >
            J&apos;ai compris
          </Button>
        </Card>
      </section>
    );
  }

  // « Pour commencer » disparaît d'elle-même quand les trois étapes sont faites : rien à fermer.
  if (firstRunDone(state)) return null;

  const rows: { done: boolean; label: string; href: string }[] = [
    { done: state.pockets > 0, label: "Créer tes poches", href: steps.pockets },
    { done: state.perfumes > 0, label: "Ajouter un parfum", href: steps.perfume },
    { done: state.documents > 0, label: "Faire une vente", href: steps.sale },
  ];

  return (
    <section className="flex flex-col gap-2" aria-label="Pour commencer" data-card="pour-commencer">
      <SectionHeader
        level={2}
        title="Pour commencer"
        description="Trois étapes, et l'app est à toi. Chacune se coche quand tu l'as faite."
      />
      <Card padding={0}>
        {rows.map((row, index) => (
          <div key={row.label}>
            {index > 0 ? <Divider /> : null}
            {row.done ? (
              <ListRow
                primary={row.label}
                leading={<Check size={20} aria-hidden className="text-[var(--admin-success)]" />}
                trailing={
                  <Text variant="caption" tone="muted">
                    Fait
                  </Text>
                }
              />
            ) : (
              <ListRow
                href={row.href}
                primary={row.label}
                leading={
                  <span
                    aria-hidden
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--admin-border-strong)]"
                  />
                }
                chevron
              />
            )}
          </div>
        ))}
      </Card>
    </section>
  );
}

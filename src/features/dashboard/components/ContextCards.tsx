"use client";

import { Check, Share, SquarePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { usePwaInstall } from "@/app-shell/pwa/install";
import type { FirstRunDTO } from "@/contracts/stats";
import { firstRunDone } from "@/contracts/stats";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Divider } from "@/ui/primitives/Divider";
import { ListRow } from "@/ui/primitives/ListRow";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { Text } from "@/ui/primitives/Text";

/**
 * E01 zone 2 — la carte contextuelle, UNE seule à la fois, par priorité (06 E01) :
 *
 *  1. « Installer l'app » — tant que la gestion tourne dans un onglet : consigne de partage sur
 *     Safari iOS, invite `beforeinstallprompt` ailleurs (04 §14.1, friction F-4.7-03). En premier
 *     parce que tout le reste (plein écran, écran de lancement, hors ligne) en dépend.
 *  2. « Pour commencer » — le vide de départ (PC-12) : trois étapes cochées automatiquement.
 *
 * L'ancienne carte « Nouveautés » (changements d'habitude du 17/09/2026) est retirée le 25/10/2026 : elle
 * comparait à une appli que l'associé du gérant n'a jamais vue.
 *
 * La carte n'est rendue qu'après le montage : le serveur ne sait pas si l'app tourne installée, et rendre
 * puis retirer ferait clignoter l'écran le plus lu de l'app.
 */

type ContextCardsProps = {
  state: FirstRunDTO;
  /** Adresses des trois étapes de « Pour commencer », fabriquées par la page (`routes.ts`). */
  steps: { pockets: string; perfume: string; sale: string };
};

export function ContextCards({ state, steps }: ContextCardsProps) {
  const [mounted, setMounted] = useState(false);
  const install = usePwaInstall();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (install.mode) {
    return (
      <section aria-label="Installer l'app" data-card="installation">
        <Card padding={4} className="flex flex-col gap-3">
          <SectionHeader
            level={2}
            title="Installer l'app"
            description="Sur l'écran d'accueil, elle s'ouvre en plein écran et démarre tout de suite."
          />
          {install.mode === "ios" ? (
            /* Les deux icônes sont celles du menu iOS : c'est ce que l'œil cherche, pas le mot. */
            <ol className="flex flex-col gap-2">
              <li className="admin-type-body flex items-center gap-2 text-[var(--admin-text)]">
                <Share size={18} aria-hidden className="shrink-0 text-[var(--admin-accent)]" />
                <span className="min-w-0">Touche « Partager » en bas de Safari.</span>
              </li>
              <li className="admin-type-body flex items-center gap-2 text-[var(--admin-text)]">
                <SquarePlus size={18} aria-hidden className="shrink-0 text-[var(--admin-accent)]" />
                <span className="min-w-0">Choisis « Sur l&apos;écran d&apos;accueil ».</span>
              </li>
            </ol>
          ) : (
            <Button variant="secondary" fullWidth onClick={install.install}>
              Installer
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={install.dismiss}>
            Ne plus proposer
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

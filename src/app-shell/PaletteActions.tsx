"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ReceivableDTO } from "@/contracts/chiffres";
import type { PocketSummary } from "@/contracts/treasury";

/**
 * Actions de résultat de la recherche globale (06 §4.4, amendement A16) qui ouvrent une SHEET plutôt que
 * de naviguer : « Encaisser xx € » sur un résultat client ouvre S02 « Tout encaisser » sur l'écran courant,
 * sans changer d'onglet.
 *
 * Le shell n'importe aucun écran (04 §1.3) : il ne peut pas rendre S02 lui-même. Il porte la DEMANDE, et un
 * hôte du registre `features` (`PaletteCollectHost`, monté par `app/admin/(gestion)/layout.tsx`) rend la
 * sheet. La demande porte tout ce que S02 réclame — la palette l'a reçu avec les résultats de recherche :
 * le tap ouvre la sheet sans aller-retour.
 */

export type CollectRequest = {
  /** Une nouvelle demande remonte une sheet neuve (clé de rendu) : la saisie ne survit pas d'un client à l'autre. */
  key: number;
  customerId: string;
  customerName: string;
  /** Créances du client, les plus anciennes d'abord (`aEncaisserDetail`, 06 S02 variante « Tout encaisser »). */
  receivables: readonly ReceivableDTO[];
  /** Poches actives du moment, ordre choisi, « Non attribué » en dernier. */
  pockets: readonly PocketSummary[];
};

type PaletteActionsValue = {
  /** Demande courante, ou `null` : aucune sheet d'action de recherche n'est ouverte. */
  collect: CollectRequest | null;
  /** Appelée par la palette APRÈS s'être fermée (06 §4.4 : la sheet n'est jamais rendue sous la palette). */
  requestCollect: (request: Omit<CollectRequest, "key">) => void;
  /** Fermeture de la sheet (glissement, ✕, succès). */
  clearCollect: () => void;
};

const NO_ACTIONS: PaletteActionsValue = {
  collect: null,
  requestCollect: () => undefined,
  clearCollect: () => undefined,
};

const PaletteActionsContext = createContext<PaletteActionsValue | null>(null);

export function PaletteActionsProvider({ children }: { children: ReactNode }) {
  const [collect, setCollect] = useState<CollectRequest | null>(null);
  const requestCollect = useCallback((request: Omit<CollectRequest, "key">) => {
    setCollect({ ...request, key: Date.now() });
  }, []);
  const clearCollect = useCallback(() => setCollect(null), []);
  const value = useMemo(() => ({ collect, requestCollect, clearCollect }), [collect, requestCollect, clearCollect]);
  return <PaletteActionsContext.Provider value={value}>{children}</PaletteActionsContext.Provider>;
}

/** La palette (shell) et l'hôte de la sheet (`features`) lisent le même contexte ; hors shell, il ne fait rien. */
export function usePaletteActions(): PaletteActionsValue {
  return useContext(PaletteActionsContext) ?? NO_ACTIONS;
}

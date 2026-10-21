"use client";

import { useEffect, useState } from "react";
import type { PerfumeSearchResponse } from "@/lib/search/perfumeSearchTypes";

export type ExtendedSearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; response: PerfumeSearchResponse };

const IDLE: ExtendedSearchState = { status: "idle" };

/**
 * La réponse vient du réseau : on ne la croit sur parole que si son
 * discriminant est l'une des formes du contrat.
 */
function parseResponse(payload: unknown): PerfumeSearchResponse | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { type } = payload as { type?: unknown };
  return type === "local_results" ||
    type === "unlisted_match" ||
    type === "reference_match" ||
    type === "external_suggestion" ||
    type === "no_results"
    ? (payload as PerfumeSearchResponse)
    : null;
}

/**
 * Réponses déjà reçues pendant la visite, par requête : effacer une lettre, ou retaper la même
 * chose, ne repart pas sur le réseau (la grille vide et les suggestions de la barre partagent ce
 * cache). Borné : les plus anciennes partent.
 */
const MEMO_MAX = 50;
const memo = new Map<string, PerfumeSearchResponse>();

function remember(query: string, response: PerfumeSearchResponse) {
  memo.delete(query);
  memo.set(query, response);
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value as string);
}

export interface ExtendedSearchOptions {
  /** En deçà, la requête est trop ambiguë pour justifier un appel réseau. */
  minLength?: number;
  debounceMs?: number;
}

/**
 * Recherche élargie — interroge `/api/perfume-search` quand le catalogue local
 * ne renvoie rien (grille vide, à 3 caractères), ou pour proposer des fiches sous le champ
 * (`SearchBox`, dès 2 caractères).
 *
 * Toute requête devenue caduque est annulée, si bien qu'une réponse lente ne peut pas écraser
 * l'affichage d'une frappe plus récente.
 */
export function useExtendedSearch(
  query: string,
  enabled: boolean,
  { minLength = 3, debounceMs = 350 }: ExtendedSearchOptions = {}
): ExtendedSearchState {
  const [state, setState] = useState<ExtendedSearchState>(IDLE);
  const trimmed = query.trim();
  const shouldSearch = enabled && trimmed.length >= minLength;

  useEffect(() => {
    if (!shouldSearch) {
      setState(IDLE);
      return;
    }

    const known = memo.get(trimmed);
    if (known) {
      setState({ status: "done", response: known });
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState({ status: "loading" });
      try {
        const response = await fetch(
          `/api/perfume-search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed = parseResponse(await response.json());
        if (!parsed) throw new Error("Réponse hors contrat");
        remember(trimmed, parsed);
        setState({ status: "done", response: parsed });
      } catch {
        /* Une requête annulée est un remplacement, pas une panne. */
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, shouldSearch, debounceMs]);

  return state;
}

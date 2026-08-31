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
 * discriminant est l'une des trois formes du contrat.
 */
function parseResponse(payload: unknown): PerfumeSearchResponse | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { type } = payload as { type?: unknown };
  return type === "local_results" ||
    type === "external_suggestion" ||
    type === "no_results"
    ? (payload as PerfumeSearchResponse)
    : null;
}

/** En deçà, la requête est trop ambiguë pour justifier un appel réseau. */
const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

/**
 * Recherche élargie — interroge `/api/perfume-search` quand le catalogue local
 * ne renvoie rien.
 *
 * Elle ne part qu'après le catalogue local, jamais en parallèle : une référence
 * déjà en ligne ne doit pas déclencher d'appel réseau. Toute requête devenue
 * caduque est annulée, si bien qu'une réponse lente ne peut pas écraser
 * l'affichage d'une frappe plus récente.
 */
export function useExtendedSearch(
  query: string,
  enabled: boolean
): ExtendedSearchState {
  const [state, setState] = useState<ExtendedSearchState>(IDLE);
  const trimmed = query.trim();
  const shouldSearch = enabled && trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!shouldSearch) {
      setState(IDLE);
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
        setState({ status: "done", response: parsed });
      } catch {
        /* Une requête annulée est un remplacement, pas une panne. */
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, shouldSearch]);

  return state;
}

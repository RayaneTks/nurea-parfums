"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionError, ActionResult } from "@/contracts/result";
import { routes } from "../routes";
import { OFFLINE_MESSAGE, UNEXPECTED_CLIENT_MESSAGE } from "./action-errors";

type ReadState<T> = { data: T | null; error: ActionError | null; loading: boolean };

/**
 * Lecture d'une des routes GET de la gestion (04 §3.5 : recherche à la frappe, sélecteur de ligne)
 * au format `ActionResult`. Annulable : une frappe plus récente abandonne la précédente ; `debounceMs`
 * pour la recherche (200 ms, 06 §4.4). `url = null` : rien à lire.
 *
 * Session expirée : retour à la connexion avec l'écran courant. Réseau coupé : `OFFLINE`.
 */
export function useReadRoute<T>(url: string | null, options: { debounceMs?: number } = {}) {
  const { debounceMs = 0 } = options;
  const router = useRouter();
  const [state, setState] = useState<ReadState<T>>({ data: null, error: null, loading: url !== null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (url === null) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true }));
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(url, { credentials: "same-origin", signal: controller.signal });
        const body = (await response.json()) as ActionResult<T>;
        if (controller.signal.aborted) return;
        if (body.ok) {
          setState({ data: body.data, error: null, loading: false });
          return;
        }
        if (body.error.code === "SESSION_EXPIRED") {
          router.replace(routes.connexion({ retour: `${window.location.pathname}${window.location.search}` }));
        }
        setState({ data: null, error: body.error, loading: false });
      } catch (cause) {
        if (controller.signal.aborted) return;
        const offline = cause instanceof TypeError || !navigator.onLine;
        setState({
          data: null,
          error: offline
            ? { code: "OFFLINE", message: OFFLINE_MESSAGE, retryable: true }
            : { code: "UNEXPECTED", message: UNEXPECTED_CLIENT_MESSAGE, retryable: false },
          loading: false,
        });
      }
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url, debounceMs, attempt, router]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return useMemo(() => ({ ...state, reload }), [state, reload]);
}

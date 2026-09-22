"use client";

import { unstable_isUnrecognizedActionError, usePathname, useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ActionError, ActionResult } from "@/contracts/result";
import { useOptionalFeedback } from "../FeedbackProvider";
import { routes } from "../routes";
import { clientActionError, failsInsideConfirmation, reservesText } from "./action-errors";

type Action<I, T> = (input: I) => Promise<ActionResult<T>>;

export type UseActionOptions<I, T> = {
  /** Toast de succès : texte fixe, ou tiré du résultat (`null` : pas de toast). */
  success?: string | ((data: T, input: I) => string | null);
  /** Élément qui pulse au succès (haptique visuelle, 05 §4.4). */
  pulse?: RefObject<HTMLElement | null>;
  /** Brouillon effacé au succès (`useDraft`). */
  draft?: { clear: () => void };
  onSuccess?: (data: T, input: I) => void;
  /**
   * `toast` (défaut, dans le shell) : les refus s'affichent en toast. `inline` : aucun toast, l'écran
   * affiche `error.message` lui-même (formulaire hors shell, erreur à garder sous les yeux).
   * `VALIDATION` n'est jamais un toast : ses messages vont sous les champs.
   */
  errors?: "toast" | "inline";
};

export type RunAction<I, T> = (input: I) => Promise<ActionResult<T>>;

function pulseOnce(element: HTMLElement | null | undefined) {
  if (!element) return;
  element.classList.remove("admin-confirm-pulse");
  // Relance l'animation si l'élément pulsait déjà.
  void element.offsetWidth;
  element.classList.add("admin-confirm-pulse");
  element.addEventListener("animationend", () => element.classList.remove("admin-confirm-pulse"), { once: true });
}

/**
 * LE moyen d'appeler une action depuis un composant (04 §3.7, §9.2) :
 * - `pending` : bouton `isLoading`, second tap sans effet (le même appel est rendu) ;
 * - succès : toast, `notice` éventuelle, pulse, brouillon effacé ;
 * - `NEEDS_CONFIRMATION` : `ConfirmDialog` avec les réserves du domaine, puis rappel avec
 *   `confirm: true` et la même entrée (même identifiant : aucun doublon possible) ; si ce rappel
 *   échoue, le message s'affiche DANS la boîte, restée ouverte (05 §3.2) — réessayer relance la même
 *   entrée, annuler rend l'échec sans toast (il a été lu) ;
 * - `VALIDATION` : rendu à l'appelant (`error.fields` sous les champs), aucun toast ;
 * - `SESSION_EXPIRED` : retour à la connexion avec l'écran courant en `retour` (le brouillon est
 *   déjà sur l'appareil) ;
 * - appel qui n'atteint pas le serveur : `OFFLINE`, toast « Pas de réseau… » avec « Réessayer ».
 *
 * `run` rend toujours un `ActionResult` : il ne lève jamais.
 */
export function useAction<I, T>(action: Action<I, T>, options: UseActionOptions<I, T> = {}) {
  const feedback = useOptionalFeedback();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const inFlight = useRef<Promise<ActionResult<T>> | null>(null);
  const optionsRef = useRef(options);
  const runRef = useRef<RunAction<I, T> | null>(null);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const call = useCallback(
    async (input: I): Promise<ActionResult<T>> => {
      try {
        return await action(input);
      } catch (cause) {
        const online = typeof navigator === "undefined" ? true : navigator.onLine;
        return { ok: false, error: clientActionError(cause, { online, outdated: unstable_isUnrecognizedActionError(cause) }) };
      }
    },
    [action],
  );

  const run: RunAction<I, T> = useCallback(
    (input: I) => {
      if (inFlight.current) return inFlight.current;
      const opts = optionsRef.current;
      const inline = opts.errors === "inline" || feedback === null;

      const execute = async (): Promise<ActionResult<T>> => {
        setPending(true);
        setError(null);
        let result = await call(input);

        if (!result.ok && result.error.code === "NEEDS_CONFIRMATION" && feedback) {
          const { confirm } = result.error;
          // Dernier résultat de l'écriture confirmée (objet : il est écrit depuis le rappel).
          const attempt: { result: ActionResult<T> | null } = { result: null };
          // L'écriture confirmée part depuis le dialogue : il reste ouvert, bouton en attente, jusqu'à sa fin.
          const accepted = await feedback.confirm(
            {
              title: confirm?.title ?? "Confirmer ?",
              description: reservesText(result.error),
              confirmLabel: confirm?.confirmLabel ?? "Confirmer",
              tone: "primary",
            },
            async () => {
              const confirmed = await call({ ...(input as object), confirm: true } as I);
              attempt.result = confirmed;
              // Rejeter garde la boîte ouverte et y affiche le message : jamais un toast sous la modale.
              if (!confirmed.ok && failsInsideConfirmation(confirmed.error)) throw new Error(confirmed.error.message);
            },
          );
          const confirmed = attempt.result;
          if (confirmed === null) return result;
          if (!accepted) {
            // Tentée, refusée, puis boîte annulée : l'erreur a été lue dans la boîte, pas de toast.
            if (!confirmed.ok) setError(confirmed.error);
            return confirmed;
          }
          result = confirmed;
        }

        if (result.ok) {
          opts.draft?.clear();
          const message = typeof opts.success === "function" ? opts.success(result.data, input) : opts.success;
          if (feedback && message) feedback.showToast({ type: "success", message });
          if (feedback && result.notice) feedback.showToast({ type: "info", message: result.notice });
          pulseOnce(opts.pulse?.current);
          opts.onSuccess?.(result.data, input);
          return result;
        }

        setError(result.error);
        const { code } = result.error;
        if (code === "SESSION_EXPIRED") {
          const retour = typeof window === "undefined" ? pathname : `${window.location.pathname}${window.location.search}`;
          router.replace(routes.connexion({ retour }));
        } else if (code !== "VALIDATION" && code !== "NEEDS_CONFIRMATION" && !inline && feedback) {
          feedback.showToast({
            type: "error",
            message: result.error.message,
            // « Réessayer » renvoie la même entrée, donc le même identifiant : toujours sûr (04 §3.6).
            ...(result.error.retryable ? { actionLabel: "Réessayer", onAction: () => void runRef.current?.(input) } : {}),
          });
        }
        return result;
      };

      const promise = execute().finally(() => {
        inFlight.current = null;
        setPending(false);
      });
      inFlight.current = promise;
      return promise;
    },
    [call, feedback, pathname, router],
  );
  useLayoutEffect(() => {
    runRef.current = run;
  }, [run]);

  return useMemo(() => ({ run, pending, error, clearError: () => setError(null) }), [run, pending, error]);
}

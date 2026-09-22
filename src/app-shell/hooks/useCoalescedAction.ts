"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ActionResult } from "@/contracts/result";
import { COALESCE_DELAY_MS, createCoalescer, type Coalescer } from "./coalesce";
import { useAction, type UseActionOptions } from "./useAction";

/**
 * Action coalescée (04 §3.7) : `schedule(entrée)` à chaque geste, seule la dernière entrée part
 * 400 ms après le dernier. La valeur en attente part aussi quand l'écran se démonte ou que l'app
 * passe en arrière-plan : un geste fait n'est jamais perdu.
 *
 * L'écran affiche la valeur locale tout de suite (optimiste) ; `pending` couvre l'attente ET l'envoi.
 */
export function useCoalescedAction<I, T>(
  action: (input: I) => Promise<ActionResult<T>>,
  options: UseActionOptions<I, T> & { delayMs?: number } = {},
) {
  const { delayMs = COALESCE_DELAY_MS, ...actionOptions } = options;
  const { run, pending: sending, error } = useAction(action, actionOptions);
  const runRef = useRef(run);
  useLayoutEffect(() => {
    runRef.current = run;
  }, [run]);
  const [waiting, setWaiting] = useState(false);
  const coalescerRef = useRef<{ delayMs: number; instance: Coalescer<I> } | null>(null);

  const coalescer = useCallback((): Coalescer<I> => {
    const current = coalescerRef.current;
    if (current && current.delayMs === delayMs) return current.instance;
    current?.instance.flush();
    const instance = createCoalescer<I>((input) => {
      setWaiting(false);
      void runRef.current(input);
    }, delayMs);
    coalescerRef.current = { delayMs, instance };
    return instance;
  }, [delayMs]);

  useEffect(() => {
    const flush = (event: Event) => {
      if (event.type === "pagehide" || document.visibilityState === "hidden") coalescerRef.current?.instance.flush();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      coalescerRef.current?.instance.flush();
    };
  }, []);

  const schedule = useCallback(
    (input: I) => {
      setWaiting(true);
      coalescer().schedule(input);
    },
    [coalescer],
  );
  const flush = useCallback(() => coalescerRef.current?.instance.flush(), []);
  const cancel = useCallback(() => {
    setWaiting(false);
    coalescerRef.current?.instance.cancel();
  }, []);

  return useMemo(
    () => ({ schedule, flush, cancel, pending: waiting || sending, error }),
    [schedule, flush, cancel, waiting, sending, error],
  );
}

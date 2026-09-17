/**
 * Coalescence d'envois (04 §3.7) : seule la dernière valeur part, `delayMs` après le dernier geste.
 * Le stepper de livraison envoie la quantité finale, pas une requête par tap — les actions Next
 * s'exécutent en file, dix taps feraient dix allers-retours.
 *
 * Sans React : testé avec de fausses horloges.
 */

export const COALESCE_DELAY_MS = 400;

export type Coalescer<I> = {
  /** Remplace la valeur en attente et relance le délai. */
  schedule: (input: I) => void;
  /** Envoie tout de suite la valeur en attente (départ de l'écran, app en arrière-plan). */
  flush: () => void;
  /** Oublie la valeur en attente sans l'envoyer. */
  cancel: () => void;
  hasPending: () => boolean;
};

type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const defaultTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createCoalescer<I>(send: (input: I) => void, delayMs = COALESCE_DELAY_MS, timers: Timers = defaultTimers): Coalescer<I> {
  let pending: { input: I } | null = null;
  let handle: unknown = null;

  const stop = () => {
    if (handle !== null) timers.clear(handle);
    handle = null;
  };

  const flush = () => {
    stop();
    if (!pending) return;
    const { input } = pending;
    pending = null;
    send(input);
  };

  return {
    schedule(input) {
      pending = { input };
      stop();
      handle = timers.set(flush, delayMs);
    },
    flush,
    cancel() {
      stop();
      pending = null;
    },
    hasPending: () => pending !== null,
  };
}

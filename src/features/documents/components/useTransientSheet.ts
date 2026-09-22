"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Durée de sortie d'une sheet (05 §2.6, 260 ms) et une marge. */
const EXIT_MS = 300;

/**
 * Une sheet transitoire (06 §1.3 : S02, S03, S04, sélecteurs…) ouverte sur un sujet : l'état vit dans le composant
 * qui l'ouvre, jamais dans l'URL. Le sujet reste disponible pendant l'animation de sortie, puis disparaît : la
 * sheet se démonte, et sa prochaine ouverture repart d'une saisie neuve (nouvel identifiant de paiement).
 */
export function useTransientSheet<T>() {
  const [subject, setSubject] = useState<{ key: number; value: T } | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const next = useRef(1);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const show = useCallback((value: T) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setSubject({ key: next.current++, value });
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setSubject(null);
    }, EXIT_MS);
  }, []);

  return useMemo(
    () => ({
      subject: subject?.value ?? null,
      /** Clé de montage : une ouverture = une saisie neuve. */
      key: subject?.key ?? 0,
      open,
      show,
      hide,
    }),
    [subject, open, show, hide],
  );
}

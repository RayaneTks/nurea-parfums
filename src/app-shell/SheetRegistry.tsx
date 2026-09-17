"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

type Entry = { id: number; requestClose: () => void };

type SheetRegistryValue = {
  register: (requestClose: () => void) => () => void;
  /** Une sheet transitoire est ouverte (hors sheets adressables par l'URL). */
  hasOpenSheet: () => boolean;
  /** Demande la fermeture de la dernière ouverte ; `false` s'il n'y en avait pas. */
  closeTopSheet: () => boolean;
};

const SheetRegistryContext = createContext<SheetRegistryValue | null>(null);

/**
 * Registre des sheets transitoires ouvertes (06 §1.3), pour que la tab bar sache qu'un tap sur
 * l'onglet actif doit d'abord fermer la sheet (06 §1.5, règle 1). Les sheets adressables (`?doc=`)
 * se lisent dans l'URL, pas ici.
 */
export function SheetRegistryProvider({ children }: { children: ReactNode }) {
  const stack = useRef<Entry[]>([]);
  const nextId = useRef(1);

  const value = useMemo<SheetRegistryValue>(
    () => ({
      register(requestClose) {
        const entry = { id: nextId.current++, requestClose };
        stack.current = [...stack.current, entry];
        return () => {
          stack.current = stack.current.filter((e) => e.id !== entry.id);
        };
      },
      hasOpenSheet: () => stack.current.length > 0,
      closeTopSheet() {
        const top = stack.current.at(-1);
        if (!top) return false;
        top.requestClose();
        return true;
      },
    }),
    [],
  );

  return <SheetRegistryContext.Provider value={value}>{children}</SheetRegistryContext.Provider>;
}

export function useSheetRegistry(): SheetRegistryValue | null {
  return useContext(SheetRegistryContext);
}

/**
 * À appeler par le composant qui ouvre une sheet transitoire (06 §1.5) :
 * `useShellSheet(open, () => requestClose())`. `requestClose` décide seul : fermer, ou demander
 * « Abandonner la saisie ? » si la saisie a été modifiée.
 */
export function useShellSheet(open: boolean, requestClose: () => void): void {
  const registry = useSheetRegistry();
  const closeRef = useRef(requestClose);
  useEffect(() => {
    closeRef.current = requestClose;
  }, [requestClose]);
  useEffect(() => {
    if (!open || !registry) return;
    return registry.register(() => closeRef.current());
  }, [open, registry]);
}

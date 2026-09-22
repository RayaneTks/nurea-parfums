"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { applyUrlPatch, readEnum, type UrlPatch } from "./url-patch";

/**
 * État d'URL (04 §3.7) : SEUL importeur autorisé de `useSearchParams` (règle ESLint).
 *
 * Le composant qui l'utilise est rendu sous `<Suspense>` dans sa page — sinon l'écran s'affiche sans
 * s'hydrater (CLAUDE.md ; détecté par `npm run test:layout`).
 *
 * Écriture : `replace` par défaut (un filtre ne remplit pas l'historique), sans remonter en haut ;
 * la navigation part dans une transition (`pending`), l'écran courant reste interactif.
 */

export type UrlWriteOptions = { history?: "replace" | "push"; scroll?: boolean };

export function useUrlState() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const search = searchParams?.toString() ?? "";

  const hrefWith = useCallback(
    (patch: UrlPatch, defaults?: Record<string, string>) => applyUrlPatch(pathname, search, patch, defaults),
    [pathname, search],
  );

  const set = useCallback(
    (patch: UrlPatch, options: UrlWriteOptions & { defaults?: Record<string, string> } = {}) => {
      const href = applyUrlPatch(pathname, search, patch, options.defaults);
      const scroll = options.scroll ?? false;
      startTransition(() => {
        if (options.history === "push") router.push(href, { scroll });
        else router.replace(href, { scroll });
      });
    },
    [pathname, search, router],
  );

  return useMemo(
    () => ({
      pathname,
      search,
      /** URL courante : chemin et query. */
      url: search ? `${pathname}?${search}` : pathname,
      get: (key: string) => searchParams?.get(key) ?? null,
      hrefWith,
      set,
      pending,
    }),
    [pathname, search, searchParams, hrefWith, set, pending],
  );
}

/**
 * Un paramètre à valeurs fermées (`vue`, `tab`, `filtre`…) : `[valeur, écrire]`. Une valeur inconnue
 * dans l'URL se lit comme le défaut ; écrire le défaut retire la clé.
 */
export function useUrlParam<T extends string>(
  key: string,
  options: { values: readonly T[]; defaultValue: T; history?: "replace" | "push" },
): [T, (next: T | null) => void, boolean] {
  const state = useUrlState();
  const { values, defaultValue, history } = options;
  const value = readEnum(state.get(key), values, defaultValue);
  const { set } = state;
  const write = useCallback(
    (next: T | null) => set({ [key]: next }, { history, defaults: { [key]: defaultValue } }),
    [set, key, history, defaultValue],
  );
  return [value, write, state.pending];
}

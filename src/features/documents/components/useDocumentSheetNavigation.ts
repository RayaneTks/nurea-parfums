"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { withSheet } from "@/app-shell/routes";

/**
 * Ouvrir et fermer la fiche document adressable (06 §1.3, A-3) sans quitter l'écran courant.
 *
 * - Ouvrir = `push` de l'URL courante avec `doc` ; un autre document déjà ouvert est REMPLACÉ (`replace`) :
 *   jamais une seconde fiche par-dessus la première.
 * - Fermer = retour d'historique si la fiche a été ouverte dans l'app (la liste revient telle qu'elle était),
 *   sinon `replace` sans `doc` ni `edition` (lien reçu, ouverture à froid).
 *
 * L'URL est lue au moment du geste (`window.location`), jamais par `useSearchParams` : ce crochet sert aussi hors
 * de tout `<Suspense>`.
 */

let openedInApp: string | null = null;

const currentUrl = () => `${window.location.pathname}${window.location.search}`;
const currentDoc = () => new URLSearchParams(window.location.search).get("doc");

export function useDocumentSheetNavigation() {
  const router = useRouter();

  const open = useCallback(
    (id: string, options: { edition?: boolean } = {}) => {
      const href = withSheet(currentUrl(), { doc: id, edition: options.edition ?? false });
      const shown = currentDoc();
      if (shown) {
        if (openedInApp === shown) openedInApp = id;
        router.replace(href, { scroll: false });
      } else {
        openedInApp = id;
        router.push(href, { scroll: false });
      }
    },
    [router],
  );

  const close = useCallback(() => {
    const shown = currentDoc();
    if (shown && openedInApp === shown && window.history.length > 1) {
      openedInApp = null;
      router.back();
      return;
    }
    openedInApp = null;
    router.replace(withSheet(currentUrl(), { doc: null, edition: false }), { scroll: false });
  }, [router]);

  const setEdition = useCallback(
    (edition: boolean) => router.replace(withSheet(currentUrl(), { edition }), { scroll: false }),
    [router],
  );

  return useMemo(() => ({ open, close, setEdition }), [open, close, setEdition]);
}

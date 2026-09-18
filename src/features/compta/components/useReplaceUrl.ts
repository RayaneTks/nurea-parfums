"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Change la query de l'écran sans allonger l'historique ni remonter en haut (un filtre, une période, une vue :
 * 04 §3.7). Les adresses sont construites par la page (`src/app-shell/routes.ts`) : le composant n'a pas besoin de
 * lire l'URL, donc pas de `useSearchParams` ni de `<Suspense>` pour les contrôles rendus avant les blocs.
 */
export function useReplaceUrl(): [(href: string) => void, boolean] {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = useCallback((href: string) => startTransition(() => router.replace(href, { scroll: false })), [router]);
  return [go, pending];
}

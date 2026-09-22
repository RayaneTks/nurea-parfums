"use client";

import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { Button } from "@/ui/primitives/Button";

/**
 * « Afficher plus » de E07 : la page suivante s'écrit dans l'URL (`pages`), en remplacement — un lien
 * partagé reste lisible, et le retour ne repasse pas par chaque palier. Le bouton reste `secondary` :
 * l'écran de lecture n'a pas d'action primaire (06 E07).
 *
 * Rendu sous le `<Suspense>` de son bloc, comme tout composant qui lit l'URL (CLAUDE.md).
 */
export function MorePerfumes({ pages }: { pages: number }) {
  const url = useUrlState();
  return (
    <div className="pt-2">
      <Button
        variant="secondary"
        fullWidth
        isLoading={url.pending}
        onClick={() => url.set({ pages: String(pages + 1) }, { defaults: { pages: "1" } })}
      >
        Afficher plus
      </Button>
    </div>
  );
}

"use client";

import { usePaletteActions } from "@/app-shell/PaletteActions";
import { CollectSheet } from "@/features/documents/components/CollectSheet";
import { targetOfReceivable } from "./collect-model";

/**
 * L'hôte de S02 « Tout encaisser » ouverte par la recherche globale (06 §4.4, A16). Monté par
 * `app/admin/(gestion)/layout.tsx`, à côté de la palette : la sheet s'ouvre sur l'écran courant, sans
 * changer d'onglet et sans que le shell ait à importer un écran (04 §1.3).
 *
 * Les quatre états sont ceux de S02 elle-même (06 S02) ; il n'y a pas d'état de chargement : les créances
 * et les poches sont arrivées avec les résultats de recherche. Une demande sans créance n'ouvre rien —
 * c'est déjà la condition d'affichage du bouton.
 */
export function PaletteCollectHost() {
  const { collect, clearCollect } = usePaletteActions();
  if (!collect || collect.receivables.length === 0) return null;
  return (
    <CollectSheet
      key={collect.key}
      open
      onClose={clearCollect}
      variant="tout"
      customerName={collect.customerName}
      targets={collect.receivables.map(targetOfReceivable)}
      pockets={collect.pockets}
    />
  );
}

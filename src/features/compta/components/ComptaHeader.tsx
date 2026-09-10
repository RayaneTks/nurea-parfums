"use client";

import { SearchField } from "@/ui/primitives/SearchField";

type ComptaHeaderProps = {
  query: string;
  onQueryChange: (next: string) => void;
};

/**
 * Recherche de la vue Ventes.
 *
 * Le titre et les actions de page vivent dans `ComptaWithTreasury` : ils sont
 * communs aux deux vues, alors que cette recherche ne filtre que les ventes et
 * les commandes confirmées.
 *
 * L'invite énumère ce sur quoi la recherche porte réellement. Elle annonçait
 * « Rechercher un client » alors qu'elle ne savait effectivement rien chercher
 * d'autre — le champ tenait sa promesse, mais la promesse était trop courte :
 * on retrouve un envoi par le parfum qu'il contenait bien plus souvent que par
 * le nom de celui qui l'a commandé.
 */
export function ComptaHeader({ query, onQueryChange }: ComptaHeaderProps) {
  return (
    <SearchField
      value={query}
      onChange={onQueryChange}
      placeholder="Client, parfum, marque, lot…"
      ariaLabel="Rechercher une vente ou une commande"
    />
  );
}

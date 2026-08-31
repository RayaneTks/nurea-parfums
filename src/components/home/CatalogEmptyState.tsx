"use client";

import type { FC } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import {
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
  type ExternalPerfumeHint,
} from "@/lib/data";
import { formatExternalSuggestionDisplay } from "@/lib/search/formatExternalSuggestionDisplay";
import type { ExtendedSearchState } from "./useExtendedSearch";

interface CatalogEmptyStateProps {
  query: string;
  /** Fiche de la marque suggérée, quand elle est déjà au catalogue. */
  suggestedBrandInCatalog: string | null;
  externalHint: ExternalPerfumeHint | null;
  extendedSearch: ExtendedSearchState;
}

/**
 * Ce qu'on montre quand la grille est vide.
 *
 * Trois cas, dans cet ordre de précision : la recherche élargie a identifié la
 * référence, un indice hors ligne la reconnaît, ou rien ne correspond. Aucun
 * n'est un cul-de-sac — chacun mène au contact, seul endroit où une commande
 * se conclut.
 */
export const CatalogEmptyState: FC<CatalogEmptyStateProps> = ({
  query,
  suggestedBrandInCatalog,
  externalHint,
  extendedSearch,
}) => {
  const trimmed = query.trim();

  if (trimmed === "") {
    return (
      <EmptyShell
        title="Aucun parfum ne correspond à ces filtres"
        body="Élargissez la sélection, ou parcourez les suggestions ci-dessous."
      />
    );
  }

  if (extendedSearch.status === "loading") {
    return (
      <EmptyShell
        title="Recherche en cours…"
        body="Nous vérifions aussi nos stocks étendus."
        withContactLink={false}
      />
    );
  }

  const suggestion =
    extendedSearch.status === "done" &&
    extendedSearch.response.type === "external_suggestion"
      ? extendedSearch.response.suggestion
      : null;

  if (suggestion) {
    const label = formatExternalSuggestionDisplay(suggestion, trimmed);
    const brand =
      suggestion.brand && suggestion.brand !== "—" ? suggestion.brand : null;

    return (
      <EmptyShell
        testId="external-api-suggestion"
        title={`Vous cherchez « ${label} »${brand ? ` de ${brand}` : ""} ?`}
        body={
          suggestedBrandInCatalog
            ? `La gamme ${suggestedBrandInCatalog} est déjà au catalogue. Cette référence peut être demandée directement.`
            : "Cette référence n'est pas encore en ligne. Nous pouvons confirmer une disponibilité ou vous proposer une alternative."
        }
      />
    );
  }

  if (externalHint) {
    return (
      <EmptyShell
        title={`Vous cherchez « ${externalHint.displayName} » ?`}
        body={externalHint.caption ?? EXTERNAL_SEARCH_FALLBACK_MESSAGE}
        footnote={
          externalHint.footnote === "none"
            ? null
            : externalHint.footnote === "legacy-offline"
              ? "Cette référence n'a pas de fiche au catalogue. Écrivez-nous : nous confirmons les commandes et les alternatives possibles."
              : "Pour un conseil ou une commande précise, passez par la page Contact : nous reprenons l'échange avec vous."
        }
      />
    );
  }

  return (
    <EmptyShell
      title={`Aucun résultat pour « ${trimmed} »`}
      body={
        extendedSearch.status === "error"
          ? "Le service de recherche élargie est momentanément indisponible. Vous pouvez reformuler, ou nous écrire directement."
          : EXTERNAL_SEARCH_FALLBACK_MESSAGE
      }
    />
  );
};

interface EmptyShellProps {
  title: string;
  body: string;
  footnote?: string | null;
  withContactLink?: boolean;
  testId?: string;
}

const EmptyShell: FC<EmptyShellProps> = ({
  title,
  body,
  footnote,
  withContactLink = true,
  testId,
}) => (
  <div
    data-testid={testId}
    className="nurea-prose border border-nurea-border p-6 md:p-10"
  >
    <p className="nurea-name text-nurea-text">{title}</p>
    <p className="nurea-body mt-4">{body}</p>
    {footnote ? <p className="nurea-caption mt-4">{footnote}</p> : null}
    {withContactLink ? (
      <Link href="/contact" className={buttonClass("outline", "mt-8")}>
        Nous écrire
      </Link>
    ) : null}
  </div>
);

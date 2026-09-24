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
 * Quatre cas, dans cet ordre de précision : la référence est au catalogue sans
 * carte en ligne (masquée), la recherche élargie l'a identifiée ailleurs, un
 * indice hors ligne la reconnaît, ou rien ne correspond. Aucun
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

  const unlisted =
    extendedSearch.status === "done" &&
    extendedSearch.response.type === "unlisted_match"
      ? extendedSearch.response.match
      : null;

  /* Au catalogue sans carte en ligne (masqué, visuels en préparation) : on ne dit
     ni qu'on l'a, ni qu'on ne l'a pas — on invite à écrire, demande pré-remplie. */
  if (unlisted) {
    const brandOnly = unlisted.on === "brand";
    return (
      <EmptyShell
        testId="unlisted-match"
        title={
          brandOnly
            ? `Vous cherchez un parfum ${unlisted.brand} ?`
            : `Vous cherchez « ${unlisted.name} » de ${unlisted.brand} ?`
        }
        body={`Tout ce que nous proposons n'est pas encore en ligne : chaque fiche demande ses visuels, et le site en ajoute au fil de l'eau. Écrivez-nous, nous vous dirons ce qu'il en est${brandOnly ? " pour cette marque" : " pour ce parfum"}.`}
        contactHref={contactHref(brandOnly ? { marque: unlisted.brand } : { parfum: unlisted.name, marque: unlisted.brand })}
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
  /** Contact pré-rempli (`?parfum=…&marque=…`), sinon la page Contact nue. */
  contactHref?: string;
  testId?: string;
}

function contactHref(params: { parfum?: string; marque?: string }): string {
  const search = new URLSearchParams();
  if (params.parfum) search.set("parfum", params.parfum);
  if (params.marque) search.set("marque", params.marque);
  return `/contact?${search.toString()}`;
}

const EmptyShell: FC<EmptyShellProps> = ({
  title,
  body,
  footnote,
  withContactLink = true,
  contactHref = "/contact",
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
      <Link href={contactHref} className={buttonClass("outline", "mt-8")}>
        Nous écrire
      </Link>
    ) : null}
  </div>
);

"use client";

import type { FC, ReactNode } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import {
  EXTERNAL_SEARCH_FALLBACK_MESSAGE,
  type ExternalPerfumeHint,
} from "@/lib/data";
import { formatExternalSuggestionDisplay } from "@/lib/search/formatExternalSuggestionDisplay";
import { contactHref } from "@/lib/search/suggestions";
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
 * Cinq cas, dans cet ordre de précision : la référence est au catalogue sans
 * carte en ligne (masquée), le répertoire des parfums existants la reconnaît,
 * la recherche élargie l'a identifiée ailleurs, un
 * indice hors ligne la reconnaît, ou rien ne correspond. Aucun
 * n'est un cul-de-sac — chacun mène au contact, seul endroit où une commande
 * se conclut.
 */
export const CatalogEmptyState: FC<CatalogEmptyStateProps> = ({
  query,
  suggestedBrandInCatalog,
  externalHint,
  extendedSearch,
}) => (
  /* Annoncé sans voler le focus : le visiteur tape encore dans la barre haute. */
  <div aria-live="polite" aria-atomic="true">
    <EmptyContent
      query={query}
      suggestedBrandInCatalog={suggestedBrandInCatalog}
      externalHint={externalHint}
      extendedSearch={extendedSearch}
    />
  </div>
);

const EmptyContent: FC<CatalogEmptyStateProps> = ({
  query,
  suggestedBrandInCatalog,
  externalHint,
  extendedSearch,
}) => {
  const trimmed = query.trim();

  if (trimmed === "") {
    return (
      <EmptyShell
        title="Ces filtres ne laissent aucun parfum"
        body="Retirez un filtre, ou parcourez les pistes ci-dessous. Une référence précise vous manque ? Écrivez-nous."
      />
    );
  }

  if (extendedSearch.status === "loading") {
    return (
      <EmptyShell
        title={<>Nous cherchons <Name>{trimmed}</Name>…</>}
        body="Nous regardons aussi les références qui ne sont pas encore en ligne."
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
            ? <>Vous cherchez un parfum <Name>{unlisted.brand}</Name> ?</>
            : <>Vous cherchez <Name>{unlisted.name}</Name> de <Name>{unlisted.brand}</Name> ?</>
        }
        body={`Tout ce que nous proposons n'est pas encore en ligne : chaque fiche attend ses photos. Écrivez-nous, nous vous dirons ce qu'il en est${brandOnly ? " pour cette marque" : " pour ce parfum"}.`}
        contactHref={contactHref(brandOnly ? { marque: unlisted.brand } : { parfum: unlisted.name, marque: unlisted.brand })}
      />
    );
  }

  const reference =
    extendedSearch.status === "done" &&
    extendedSearch.response.type === "reference_match"
      ? extendedSearch.response.match
      : null;

  /* Parfum qui existe ailleurs, pas encore chez nous : on le nomme, on dit qu'il n'est peut-être
     pas encore ajouté, et la demande part pré-remplie. */
  if (reference) {
    const brandOnly = reference.on === "brand";
    const brand = reference.line ? `${reference.brand} (${reference.line})` : reference.brand;
    return (
      <EmptyShell
        testId="reference-match"
        title={
          brandOnly
            ? <>Vous cherchez un parfum <Name>{reference.brand}</Name> ?</>
            : <>Vous cherchez <Name>{reference.name}</Name> de <Name>{brand}</Name> ?</>
        }
        body={`${brandOnly ? "Cette marque n'a peut-être pas encore été ajoutée" : "Ce parfum n'a peut-être pas encore été ajouté"} au catalogue : il s'enrichit au fil des demandes. Écrivez-nous, nous vous dirons s'il est disponible.`}
        contactHref={contactHref(brandOnly ? { marque: reference.brand } : { parfum: reference.name, marque: reference.brand })}
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
        title={brand ? <>Vous cherchez <Name>{label}</Name> de <Name>{brand}</Name> ?</> : <>Vous cherchez <Name>{label}</Name> ?</>}
        body={
          suggestedBrandInCatalog
            ? `La marque ${suggestedBrandInCatalog} est déjà au catalogue. Cette référence se demande directement.`
            : "Cette référence n'est pas encore en ligne. Écrivez-nous : nous confirmons sa disponibilité ou proposons une alternative."
        }
        contactHref={contactHref({ parfum: label, marque: brand ?? undefined })}
      />
    );
  }

  if (externalHint) {
    return (
      <EmptyShell
        title={<>Vous cherchez <Name>{externalHint.displayName}</Name> ?</>}
        body={externalHint.caption ?? EXTERNAL_SEARCH_FALLBACK_MESSAGE}
        footnote={
          externalHint.footnote === "none"
            ? null
            : externalHint.footnote === "legacy-offline"
              ? "Cette référence n'a pas de fiche au catalogue. Écrivez-nous : nous confirmons les commandes et les alternatives possibles."
              : "Pour un conseil ou une commande précise, écrivez-nous : nous reprenons l'échange avec vous."
        }
        contactHref={contactHref({ parfum: externalHint.displayName })}
      />
    );
  }

  /* Rien de reconnu : on ne ferme pas la porte, la saisie part telle quelle dans la demande. */
  return (
    <EmptyShell
      title={<>Vous cherchez <Name>{trimmed}</Name> ?</>}
      body={
        extendedSearch.status === "error"
          ? "Notre recherche élargie ne répond pas pour l'instant. Écrivez-nous : nous vérifions à la main."
          : "Il n'est peut-être pas encore au catalogue : il s'enrichit au fil des demandes. Écrivez-nous, nous vous dirons s'il est disponible ou vous proposerons une piste proche."
      }
      contactHref={contactHref({ parfum: trimmed })}
    />
  );
};

/** Le nom cherché, en italique de titrage : il porte la phrase. */
const Name: FC<{ children: ReactNode }> = ({ children }) => (
  <em className="[overflow-wrap:anywhere]">{children}</em>
);

interface EmptyShellProps {
  title: ReactNode;
  body: string;
  footnote?: string | null;
  withContactLink?: boolean;
  /** Contact pré-rempli (`?parfum=…&marque=…`), sinon la page Contact nue. */
  contactHref?: string;
  testId?: string;
}

/* Grille vide = l'action utile de l'écran : le lien de contact y est le bouton plein. */
const EmptyShell: FC<EmptyShellProps> = ({
  title,
  body,
  footnote,
  withContactLink = true,
  contactHref = "/contact",
  testId,
}) => (
  <div data-testid={testId} className="flex flex-col items-start gap-4 rounded-lg bg-surface-1 p-6 md:p-10">
    <p className="t-title t-measure">{title}</p>
    <p className="t-body t-measure text-fg-2">{body}</p>
    {footnote ? <p className="t-caption t-measure">{footnote}</p> : null}
    {withContactLink ? (
      <Link href={contactHref} className={buttonClass("solid", "mt-4")}>
        Écrivez-nous
      </Link>
    ) : null}
  </div>
);

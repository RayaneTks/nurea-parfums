"use client";

import type { FC } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import type { ExtendedSearchState } from "./useExtendedSearch";

interface CatalogEmptyStateProps {
  query: string;
  /** Fiche de la marque suggérée, quand elle est déjà au catalogue. */
  suggestedBrandInCatalog: string | null;
  extendedSearch: ExtendedSearchState;
}

/**
 * Ce qu'on montre quand la grille est vide.
 *
 * Trois cas, dans cet ordre de précision : la référence est au catalogue sans
 * carte en ligne (masquée), le référentiel des parfums du monde la reconnaît,
 * ou rien ne correspond. Aucun n'est un cul-de-sac — chacun mène au contact,
 * seul endroit où une commande se conclut.
 */
export const CatalogEmptyState: FC<CatalogEmptyStateProps> = ({
  query,
  suggestedBrandInCatalog,
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

  const reference =
    extendedSearch.status === "done" &&
    extendedSearch.response.type === "reference_match"
      ? extendedSearch.response.match
      : null;

  /* Reconnu dans le référentiel mondial : peut-être pas encore ajouté au catalogue.
     On invite à écrire, demande pré-remplie. */
  if (reference) {
    const brandOnly = reference.kind === "brand";
    return (
      <EmptyShell
        testId="reference-match"
        title={
          brandOnly
            ? `Vous recherchez un parfum ${reference.brand} ?`
            : `Vous recherchez « ${reference.name} » de ${reference.brand} ?`
        }
        body={
          brandOnly
            ? "Cette marque n'est peut-être pas encore ajoutée au catalogue, mais contactez-nous : nous vous dirons ce que nous pouvons vous proposer."
            : suggestedBrandInCatalog
              ? `Ce parfum n'a peut-être pas encore été ajouté au catalogue, mais la marque ${suggestedBrandInCatalog} y est déjà. Contactez-nous : nous vous dirons s'il est disponible.`
              : "Ce parfum n'a peut-être pas encore été ajouté au catalogue, mais contactez-nous : nous vous dirons s'il est disponible, ou nous vous proposerons une alternative."
        }
        contactHref={contactHref(
          brandOnly ? { marque: reference.brand } : { parfum: reference.name, marque: reference.brand },
        )}
      />
    );
  }

  return (
    <EmptyShell
      title={`Vous recherchez « ${trimmed} » ?`}
      body={
        extendedSearch.status === "error"
          ? "La recherche élargie est momentanément indisponible. Vous pouvez reformuler, ou nous écrire directement."
          : FALLBACK_MESSAGE
      }
      contactHref={contactHref({ parfum: trimmed })}
    />
  );
};

/** Rien de reconnu : on invite quand même à écrire, sans laisser le client face à un mur. */
const FALLBACK_MESSAGE =
  "Ce parfum n'a peut-être pas encore été ajouté au catalogue. Écrivez-nous : nous vous dirons s'il est disponible, ou nous vous proposerons une alternative.";

interface EmptyShellProps {
  title: string;
  body: string;
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
    {withContactLink ? (
      <Link href={contactHref} className={buttonClass("outline", "mt-8")}>
        Nous écrire
      </Link>
    ) : null}
  </div>
);

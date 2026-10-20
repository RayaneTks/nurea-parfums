import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSection } from "@/components/home/CatalogSection";
import demoCatalogue from "@/lib/catalog/demo-catalogue.json";
import type { CatalogBrowseBrand } from "@/lib/catalog/catalogBrowseTypes";
import { brandSlug } from "@/lib/slugify";
import type { Perfume } from "@/lib/data";
import fixture from "../../../e2e/fixtures/vitrine-extremes.json";

/**
 * Jeu d'essai extrême de la refonte (T6) — DÉVELOPPEMENT SEULEMENT, retiré avant T23.
 *
 * `?jeu=extremes` (défaut) : noms de 60 caractères, marque d'une lettre, ligne très
 * longue, accents, image cassée. `?jeu=0`, `?jeu=1`, `?jeu=193` : nombre de résultats.
 * Rendu par le vrai catalogue ; en production, 404, et jamais indexé.
 */
export const metadata: Metadata = {
  title: "Jeu d'essai",
  robots: { index: false, follow: false },
};

const EXTREMES = fixture.extremes as Perfume[];
const DEMO_PERFUMES = demoCatalogue as Perfume[];

/** 193 fiches : le catalogue de démonstration, répété avec des identifiants distincts. */
function many(count: number): Perfume[] {
  const source = [...EXTREMES, ...DEMO_PERFUMES];
  return Array.from({ length: count }, (_, i) => ({ ...source[i % source.length]!, id: 800000 + i }));
}

const SETS: Record<string, () => Perfume[]> = {
  extremes: () => EXTREMES,
  "0": () => [],
  "1": () => EXTREMES.slice(0, 1),
  "193": () => many(193),
};

function browseOf(perfumes: Perfume[]): CatalogBrowseBrand[] {
  const counts = new Map<string, number>();
  for (const p of perfumes) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts].map(([name, publishedCount]) => ({
    id: brandSlug(name),
    name,
    slug: brandSlug(name),
    publishedCount,
  }));
}

export default async function EssaiExtremesPage({
  searchParams,
}: {
  searchParams: Promise<{ jeu?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { jeu = "extremes" } = await searchParams;
  const perfumes = (SETS[jeu] ?? (() => EXTREMES))();

  return (
    <div className="page-x flex flex-col gap-6 py-8">
      <h1 className="t-title">Jeu d&apos;essai</h1>
      <nav aria-label="Jeux d'essai">
        <ul className="flex flex-wrap gap-2">
          {Object.keys(SETS).map((key) => (
            <li key={key}>
              <Link
                href={`/essai-extremes?jeu=${key}`}
                aria-current={key === jeu ? "page" : undefined}
                className="flex h-11 items-center rounded-md border border-line px-4 text-fg-1 aria-[current=page]:bg-surface-2"
              >
                {key === "extremes" ? "Cas extrêmes" : `${key} résultat${key === "1" ? "" : "s"}`}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Suspense>
        <CatalogSection catalogPerfumes={perfumes} browseBrands={browseOf(perfumes)} />
      </Suspense>
    </div>
  );
}

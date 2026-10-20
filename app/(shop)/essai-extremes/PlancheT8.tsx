"use client";

import { useState, type FC } from "react";
import { PerfumeCard } from "@/components/features/PerfumeCard";
import { PerfumeCardSkeleton } from "@/components/features/PerfumeCardSkeleton";
import { Button, SUCCESS_MS, type ButtonVariant } from "@/components/ui/Button";
import type { Perfume } from "@/lib/data";

/**
 * Planche de T8 — DÉVELOPPEMENT SEULEMENT, retirée avec la page avant T23.
 * Cartes (cas extrêmes + fiches avec ambiance), squelettes, et les huit états des trois boutons.
 * Survol, focus et appui se montrent au pointeur et au clavier ; les cinq autres sont posés.
 */
export const PlancheT8: FC<{ perfumes: Perfume[] }> = ({ perfumes }) => {
  const [opened, setOpened] = useState<string>();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="t8-cartes" className="flex flex-col gap-4">
        <h2 id="t8-cartes" className="t-subtitle">Cartes</h2>
        <p className="t-caption" aria-live="polite">{opened ? `Ouverte : ${opened}` : "Toucher une carte l'ouvre (ici : son nom s'affiche)."}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {perfumes.map((perfume, index) => (
            <PerfumeCard key={perfume.id} perfume={perfume} onOpen={(p) => setOpened(p.name)} imagePriority={index < 2} />
          ))}
          <PerfumeCardSkeleton />
          <PerfumeCardSkeleton />
        </div>
      </section>

      <section aria-labelledby="t8-boutons" className="flex flex-col gap-4">
        <h2 id="t8-boutons" className="t-subtitle">Boutons, huit états</h2>
        {(["solid", "outline", "link"] as ButtonVariant[]).map((variant) => (
          <div key={variant} className="flex flex-wrap items-start gap-3" data-variant={variant}>
            <Button variant={variant}>Repos, survol, focus, appui</Button>
            <Button variant={variant} disabled>Désactivé</Button>
            <Button variant={variant} state="loading">Chargement</Button>
            <Button variant={variant} state="error" feedback="La copie a échoué : recopiez le nom à la main.">
              Erreur
            </Button>
            <Button
              variant={variant}
              state={copied ? "success" : undefined}
              feedback="Nom copié"
              onClick={() => {
                setCopied(true);
                setTimeout(() => setCopied(false), SUCCESS_MS);
              }}
            >
              Succès (toucher)
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
};

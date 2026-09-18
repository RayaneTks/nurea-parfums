import { Block } from "@/app-shell/Block";
import { openBatches } from "@/server/batches/queries";
import { pickerCatalogue } from "@/server/catalogue/queries";
import { composerPrefill, recentlySold } from "@/server/documents/queries";
import { getSettings } from "@/server/settings/queries";
import { activePockets } from "@/server/treasury/queries";
import { Composer } from "../components/Composer";
import { RecentlySold, RecentlySoldSkeleton } from "../components/RecentlySold";
import type { SellParams } from "../pages/params";

/**
 * E11 — ce que le composeur doit connaître pour dire l'effet de son CTA : poches du moment (N2), lots ouverts (N9),
 * réglages (taux par défaut), version du sélecteur, et ce que désignent les paramètres d'URL — en un aller-retour
 * parallèle. « Vendus récemment » arrive dans son propre bloc : seule la grille attend (06 E11 « Chargement »).
 */
export async function ComposerBlock({ params }: { params: SellParams }) {
  const withPrefill = params.client !== null || params.parfum !== null || params.depuis !== null;
  const [pockets, batches, settings, picker, prefill] = await Promise.all([
    activePockets(),
    openBatches(),
    getSettings(),
    pickerCatalogue(),
    withPrefill ? composerPrefill(params.client, params.parfum, params.depuis) : null,
  ]);
  return (
    <Composer
      pockets={pockets}
      batches={batches}
      settings={settings}
      pickerVersion={picker.version}
      catalogueCount={picker.perfumes.length}
      params={{ mode: params.mode, prefill }}
      recent={
        <Block fallback={<RecentlySoldSkeleton />} errorMessage="Récents indisponibles.">
          <RecentBlock />
        </Block>
      }
    />
  );
}

/** N7 — les 8 parfums vendus récemment, dernière contenance et dernier prix. */
async function RecentBlock() {
  const items = await recentlySold();
  return <RecentlySold items={items} />;
}

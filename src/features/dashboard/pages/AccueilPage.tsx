import { Settings } from "lucide-react";
import { Block } from "@/app-shell/Block";
import { DocumentSheetSlot } from "@/features/documents";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import {
  HomeBatchesBlock,
  HomeMoneyBlock,
  HomePipelineBlock,
  HomeTopBlock,
  HomeTopPerfumesBlock,
} from "../blocks/HomeBlocks";
import { MoneySkeleton, TodaySkeleton } from "../blocks/skeletons";
import { homeLinks } from "../links";

/**
 * E01 — Accueil (06 E01). L'écran d'atterrissage : ce qui est ANORMAL se voit, le reste reste calme, et
 * chaque chiffre est un lien vers l'écran qui le résout (05 §3.2).
 *
 * Structure de `Suspense` de 06 E01 : les zones 2, 3 et 4 partagent un bloc (le squelette est celui de la
 * carte « Aujourd'hui ») ; les zones 5 à 8 sont des blocs IMBRIQUÉS sous lui et ne se révèlent qu'après —
 * seuls des squelettes peuvent se déplacer, jamais un contenu déjà rendu. Le bloc Argent a son squelette
 * exact, à sa place définitive ; les zones 6 à 8, conditionnelles, n'ont pas de squelette (elles n'existent
 * peut-être pas, et réserver leur hauteur ferait sauter l'écran à leur absence).
 *
 * Écran de LECTURE : aucune action primaire (06 E01). Le titre s'affiche tout de suite, avant tout chiffre.
 */
export function AccueilPage({ docId }: { docId?: string }) {
  const links = homeLinks();

  return (
    <PageScaffold ariaLabel="Accueil" docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>
      <SectionHeader title="Accueil" />

      <Block fallback={<TodaySkeleton />} errorMessage="Chiffres indisponibles.">
        <HomeTopBlock links={links}>
          <Block fallback={<MoneySkeleton />} errorMessage="Chiffres indisponibles.">
            <HomeMoneyBlock links={links} />
          </Block>
          <Block fallback={null} errorMessage="Commandes indisponibles.">
            <HomePipelineBlock links={links} />
          </Block>
          <Block fallback={null} errorMessage="Lots indisponibles.">
            <HomeBatchesBlock links={links} />
          </Block>
          <Block fallback={null} errorMessage="Classement indisponible.">
            <HomeTopPerfumesBlock links={links} />
          </Block>
        </HomeTopBlock>
      </Block>

      {/* Zone 9 — la rangée « Réglages » (E08). Rendue quand l'écran existe (jalon J15) : un raccourci vers
          une page absente serait un cul-de-sac, et le jour où elle arrive la rangée apparaît d'elle-même. */}
      {links.settings ? (
        <Card padding={0}>
          <ListRow href={links.settings} primary="Réglages" leading={<Settings size={20} aria-hidden />} chevron />
        </Card>
      ) : null}
    </PageScaffold>
  );
}

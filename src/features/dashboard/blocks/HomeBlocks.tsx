import type { ReactNode } from "react";
import { OPEN_BATCHES_HOME, TOP_PERFUMES_HOME, isFirstRun } from "@/contracts/stats";
import { tableauDeBord } from "@/server/chiffres";
import { accueilComptes, classementParfums, lotsOuverts } from "@/server/stats/queries";
import { activePockets } from "@/server/treasury/queries";
import { AlertsList } from "../components/AlertsList";
import { TopPerfumes } from "../components/Classement";
import { ContextCards } from "../components/ContextCards";
import { MoneyTiles } from "../components/MoneyTiles";
import { OpenBatches, Pipeline } from "../components/Pipeline";
import { TodayCard } from "../components/TodayCard";
import { alertRows, pipelineTiles } from "../components/home-model";
import type { HomeLinks } from "../links";

/**
 * E01 — bloc 1 (zones 2, 3 et 4) : la carte contextuelle, « À faire » et « Aujourd'hui ». C'est LE bloc qui
 * paie les allers-retours de l'écran : le composite des chiffres (`tableauDeBord()`, 04 §6.3 — un seul
 * aller-retour) et les comptes de l'Accueil (`accueilComptes()`). Les blocs suivants, passés en `children`,
 * ne se révèlent qu'après lui (06 E01 « États ») et relisent ces résultats en mémoire (`react.cache`).
 *
 * Vide de départ (aucun document, aucun parfum) : la carte « Pour commencer » et rien d'autre — les blocs 3
 * à 8 sont absents, l'Accueil oriente au lieu d'afficher des zéros (05 §5.1).
 */
export async function HomeTopBlock({ links, children }: { links: HomeLinks; children: ReactNode }) {
  const [figures, comptes] = await Promise.all([tableauDeBord(), accueilComptes()]);
  const premiere = comptes.premiereUtilisation;
  const rows = alertRows(figures);
  // Les poches ne sont lues que si « Répartir » peut s'ouvrir : une requête qu'on n'affiche pas ne se fait
  // pas (01 §4.6 : l'ancien tableau de bord payait un aller-retour sans aucun consommateur).
  const pockets = rows.some((row) => row.actsInPlace) ? await activePockets() : [];

  if (isFirstRun(premiere)) {
    return <ContextCards state={premiere} steps={links.steps} />;
  }

  return (
    <>
      <ContextCards state={premiere} steps={links.steps} />
      <AlertsList rows={rows} hrefs={links.alerts} pockets={pockets} />
      <TodayCard
        // L'Encaissé du jour vient du composite des chiffres, jamais d'une seconde requête (04 §6.3).
        today={{ ...comptes.aujourdhui, encaisse: figures.encaisseJour }}
        dateLabel={links.todayLabel}
        recapHref={links.recap}
        todayHref={links.deliverToday}
        tomorrowHref={links.deliverTomorrow}
      />
      {children}
    </>
  );
}

/**
 * E01 zone 5 — le bloc Argent (A-13). `tableauDeBord()` a déjà répondu au bloc 1 : cet appel le relit en
 * mémoire, sans second aller-retour (04 §6.3).
 */
export async function HomeMoneyBlock({ links }: { links: HomeLinks }) {
  const figures = await tableauDeBord();
  return (
    <MoneyTiles
      period={links.monthLabel}
      encaisse={figures.encaisseMois}
      margeNette={figures.margeNetteMois}
      aEncaisser={figures.aEncaisser}
      tresorerie={figures.tresorerie.total}
      comptaHref={links.compta}
      collectHref={links.collect}
      treasuryHref={links.treasury}
    />
  );
}

/** E01 zone 6 — « Commandes à livrer », depuis le même composite. */
export async function HomePipelineBlock({ links }: { links: HomeLinks }) {
  const figures = await tableauDeBord();
  return <Pipeline tiles={pipelineTiles(figures.commandes)} hrefs={links.pipeline} />;
}

/**
 * E01 zone 7 — « Lots ouverts ». Le bloc n'est rendu que si les écrans des lots existent (E05/E06, jalon
 * J13) : `routes.isNavigable` le dit, et le jour où J13 arrive le bloc apparaît sans rien changer ici. Un
 * chiffre qui mène à une page inexistante serait pire que son absence.
 */
export async function HomeBatchesBlock({ links }: { links: HomeLinks }) {
  if (!links.batches) return null;
  const [batches, comptes] = await Promise.all([lotsOuverts(OPEN_BATCHES_HOME), accueilComptes()]);
  return (
    <OpenBatches
      batches={batches}
      hrefOf={links.batches.of}
      listHref={links.batches.list}
      createHref={comptes.batches === 0 ? links.batches.create : null}
    />
  );
}

/** E01 zone 8 — « Top parfums · (mois) », 5 lignes ; absent s'il n'y a eu aucune vente ce mois-ci. */
export async function HomeTopPerfumesBlock({ links }: { links: HomeLinks }) {
  const data = await classementParfums(links.monthKey, TOP_PERFUMES_HOME);
  return (
    <TopPerfumes
      entries={data.entries}
      title={`Top parfums · ${links.monthLabel}`}
      statsHref={links.stats}
      hrefOf={links.perfumeOf}
    />
  );
}

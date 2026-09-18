/**
 * Banc des états de l'Accueil (06 E01 « États », J14) : les VRAIS composants de `src/features/dashboard`
 * montés dans `/admin` avec des données choisies, sous la feuille admin réelle.
 *
 * Trois états que le jeu e2e ne peut pas produire tous les trois (il porte des documents et des alertes de
 * stock) : le **vide de première utilisation**, le **nominal** et **« tout va bien »** (rien à faire). Compilé
 * par esbuild (`e2e/helpers/banc.ts`) et injecté dans la page, comme le banc des couches.
 *
 * Aucune route de test n'existe dans l'app.
 */
import { createRoot } from "react-dom/client";
import type { DashboardFiguresDTO } from "@/contracts/chiffres";
import type { FirstRunDTO, OpenBatchDTO, TodayDTO, TopPerfumeDTO } from "@/contracts/stats";
import type { MoneyString } from "@/domain/money";
import { FeedbackProvider } from "@/app-shell/FeedbackProvider";
import { UndoProvider } from "@/app-shell/UndoProvider";
import { AlertsList } from "@/features/dashboard/components/AlertsList";
import { TopPerfumes } from "@/features/dashboard/components/Classement";
import { ContextCards } from "@/features/dashboard/components/ContextCards";
import { MoneyTiles } from "@/features/dashboard/components/MoneyTiles";
import { OpenBatches, Pipeline } from "@/features/dashboard/components/Pipeline";
import { TodayCard } from "@/features/dashboard/components/TodayCard";
import { alertRows, pipelineTiles } from "@/features/dashboard/components/home-model";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import { SectionHeader } from "@/ui/patterns/SectionHeader";
import { ACCUEIL_SCENES, BANC_ACCUEIL, type AccueilScene } from "./accueil-contrat";

const m = (value: string) => value as MoneyString;

const MARGE = {
  value: m("1240.00"),
  percent: "38,5",
  encaisse: m("3220.00"),
  costs: m("1800.00"),
  expenses: m("180.00"),
  hasUnknownCost: false,
  unknownCostCount: 0,
};

/** Un Accueil chargé : de tout, et des libellés longs (« Yves Saint Laurent ») pour éprouver la troncature. */
const NOMINAL: DashboardFiguresDTO = {
  month: { from: "2026-08-31T22:00:00.000Z", to: "2026-09-30T22:00:00.000Z" },
  encaisseMois: m("3220.00"),
  encaisseJour: m("240.00"),
  margeNetteMois: MARGE,
  aEncaisser: m("825.00"),
  tresorerie: { total: m("1546.00"), unassigned: m("120.00") },
  enRetard: 3,
  clientsARelancer: 2,
  coutACompleter: 2,
  commandes: { enAttente: 2, confirmees: 5 },
  stock: { threshold: 3, out: { count: 1, perfumeIds: [4] }, low: { count: 3, perfumeIds: [2, 6, 10] } },
};

/** Rien à faire : aucune alerte, aucun non attribué — la bonne nouvelle silencieuse (06 E01). */
const CALME: DashboardFiguresDTO = {
  ...NOMINAL,
  aEncaisser: m("0.00"),
  tresorerie: { total: m("1546.00"), unassigned: m("0.00") },
  enRetard: 0,
  clientsARelancer: 0,
  coutACompleter: 0,
  commandes: { enAttente: 0, confirmees: 0 },
  stock: { threshold: 3, out: { count: 0, perfumeIds: [] }, low: { count: 0, perfumeIds: [] } },
};

const TODAY: TodayDTO = {
  jour: "2026-09-17",
  encaisse: m("240.00"),
  ventes: 3,
  commandesPrises: 1,
  aLivrerAujourdhui: 2,
  aLivrerDemain: 3,
};

const TODAY_CALME: TodayDTO = { ...TODAY, ventes: 0, commandesPrises: 0, aLivrerAujourdhui: 0, aLivrerDemain: 0 };

const BATCHES: OpenBatchDTO[] = [
  { id: "lot-1", name: "Commande de mars", expectedAt: "2026-10-03T00:00:00.000Z", documentCount: 12, margeNette: m("430.00"), hasUnknownCost: false },
  { id: "lot-2", name: "Réassort Lattafa de septembre", expectedAt: null, documentCount: 3, margeNette: m("0.00"), hasUnknownCost: true },
];

const TOP: TopPerfumeDTO[] = [
  { rank: 1, key: "parfum:1", perfumeId: 1, name: "Sauvage", brandName: "Dior", image: null, units: 12, isOffCatalog: false },
  { rank: 2, key: "parfum:9", perfumeId: 9, name: "Libre", brandName: "Yves Saint Laurent", image: null, units: 8, isOffCatalog: false },
  { rank: 3, key: "nom:lattafa oud mood elixir", perfumeId: null, name: "Lattafa Oud Mood Elixir 100 ml", brandName: null, image: null, units: 5, isOffCatalog: true },
];

const FIRST_RUN_EMPTY: FirstRunDTO = { pockets: 0, perfumes: 0, documents: 0 };
const FIRST_RUN_DONE: FirstRunDTO = { pockets: 2, perfumes: 20, documents: 35 };

/** Adresses réelles de la gestion : le banc ne teste pas la navigation, seulement l'affichage. */
const LINKS = {
  alerts: {
    retard: "/admin/commandes?filtre=retard",
    "a-relancer": "/admin/encaisser?anciennete=30",
    "cout-a-completer": "/admin/compta?periode=tout&filtre=cout-a-completer",
    rupture: "/admin/catalogue?stock=rupture",
    "stock-bas": "/admin/catalogue?stock=bas",
  },
  pipeline: { "en-attente": "/admin/commandes?filtre=en-attente", confirmees: "/admin/commandes?filtre=confirmees" },
  steps: { pockets: "/admin/compta?vue=tresorerie", perfume: "/admin/catalogue/parfums/nouveau", sale: "/admin/vendre" },
} as const;

function Scene({ scene }: { scene: AccueilScene }) {
  const figures = scene === "tout-va-bien" ? CALME : NOMINAL;
  const today = scene === "tout-va-bien" ? TODAY_CALME : TODAY;
  const first = scene === "vide-de-depart" ? FIRST_RUN_EMPTY : FIRST_RUN_DONE;

  return (
    <FeedbackProvider>
      <UndoProvider>
        <div className="flex flex-col gap-4 px-4 pt-3" data-banc-accueil={scene}>
          <SectionHeader title="Accueil" />
          <ContextCards state={first} steps={LINKS.steps} />
          {scene === "vide-de-depart" ? null : (
            <>
              <AlertsList rows={alertRows(figures)} hrefs={LINKS.alerts} pockets={[]} />
              <TodayCard
                today={today}
                dateLabel="jeudi 17 septembre"
                recapHref="/admin/journee"
                todayHref="/admin/commandes?filtre=aujourdhui"
                tomorrowHref="/admin/commandes?filtre=demain"
              />
              <MoneyTiles
                period="septembre"
                encaisse={figures.encaisseMois}
                margeNette={figures.margeNetteMois}
                aEncaisser={figures.aEncaisser}
                tresorerie={figures.tresorerie.total}
                comptaHref="/admin/compta"
                collectHref="/admin/encaisser"
                treasuryHref="/admin/compta?vue=tresorerie"
              />
              <Pipeline tiles={pipelineTiles(figures.commandes)} hrefs={LINKS.pipeline} />
              <OpenBatches
                batches={scene === "tout-va-bien" ? [] : BATCHES}
                hrefOf={(id: string) => `/admin/lots/${id}`}
                listHref="/admin/lots"
                createHref={scene === "tout-va-bien" ? "/admin/lots/nouveau" : null}
                now={new Date("2026-09-17T08:00:00Z")}
              />
              <TopPerfumes
                entries={scene === "tout-va-bien" ? [] : TOP}
                title="Top parfums · septembre"
                statsHref="/admin/statistiques"
                hrefOf={(id: number) => `/admin/catalogue/parfums/${id}`}
              />
            </>
          )}
          <Card padding={0}>
            <ListRow href="/admin/reglages" primary="Réglages" chevron />
          </Card>
        </div>
      </UndoProvider>
    </FeedbackProvider>
  );
}

function mount(scene: string): void {
  if (!(ACCUEIL_SCENES as readonly string[]).includes(scene)) throw new Error(`Banc Accueil : scène inconnue « ${scene} ».`);
  const main = document.querySelector("#main-content");
  if (!main) throw new Error("Banc Accueil : #main-content absent (page de la gestion attendue).");
  main.replaceChildren();
  const host = document.createElement("div");
  host.className = "flex min-h-0 flex-1 flex-col";
  main.appendChild(host);
  createRoot(host).render(<Scene scene={scene as AccueilScene} />);
}

(window as unknown as Record<string, { mount: (scene: string) => void }>)[BANC_ACCUEIL] = { mount };

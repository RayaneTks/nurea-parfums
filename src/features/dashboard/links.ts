import { isNavigable, routes } from "@/app-shell/routes";
import { periodFromParams, type PeriodKey } from "@/contracts/chiffres";
import { OLD_RECEIVABLE_DAYS } from "@/domain/document-balance";
import { periodLabel } from "@/domain/periods";
import { formatDate } from "@/ui/patterns/date-format";
import type { AlertKind } from "./components/home-model";

/**
 * Toutes les adresses de l'Accueil, fabriquées UNE fois par la page et passées aux blocs : aucune URL ne
 * s'écrit hors de `src/app-shell/routes.ts` (04 §2.2), et les composants restent ignorants des routes.
 *
 * Chaque adresse d'alerte ouvre EXACTEMENT l'ensemble que son chiffre compte (05 §5.3) :
 *
 *  - « en retard » → `commandes?filtre=retard` : même prédicat que `enRetard()` (section « retard » de la
 *    liste, `src/server/documents/sql.ts`) ;
 *  - « clients à relancer » → `encaisser?anciennete=30` : les groupes de E13 filtrés par
 *    `creancesAnciennes()` (03 §5.8) ;
 *  - « coût à compléter » → Compta période « Tout » + filtre : exactement `coutACompleter("all")` ;
 *  - « rupture » et « stock bas » → deux filtres distincts du catalogue, comptés séparément (06 §1.7).
 */
export type HomeLinks = {
  /** « septembre » : la période du bloc Argent et du bloc Top parfums (le même mois). */
  monthLabel: string;
  monthKey: PeriodKey;
  /** « jeudi 17 septembre » : l'en-tête du bloc « Aujourd'hui ». */
  todayLabel: string;
  alerts: Readonly<Partial<Record<AlertKind, string>>>;
  pipeline: Readonly<Record<"en-attente" | "confirmees", string>>;
  compta: string;
  collect: string;
  treasury: string;
  recap: string;
  stats: string;
  deliverToday: string;
  deliverTomorrow: string;
  /** `null` tant que les écrans des lots n'existent pas (E05/E06, jalon J13). */
  batches: { list: string; create: string | null; of: (id: string) => string } | null;
  /** `null` tant que les Réglages n'existent pas (E08, jalon J15). */
  settings: string | null;
  perfumeOf: (perfumeId: number) => string;
  steps: { pockets: string; perfume: string; sale: string };
};

/**
 * Les adresses et les libellés de l'Accueil pour « maintenant ». `hasBatch` : au moins un lot existe (la
 * rangée « Créer un lot » ne se propose qu'à celui qui n'en a aucun, 06 E01 zone 7).
 */
export function homeLinks(now: Date = new Date()): HomeLinks {
  const lotsLivres = isNavigable(routes.lots());
  return {
    monthLabel: periodLabel("month", now, { withYear: false }),
    monthKey: periodFromParams({ periode: "mois" }, "mois"),
    todayLabel: formatDate(now, "long", now),
    alerts: {
      retard: routes.commandes({ filtre: "retard" }),
      "a-relancer": routes.encaisser({ anciennete: OLD_RECEIVABLE_DAYS }),
      "cout-a-completer": routes.compta({ periode: "tout", filtre: "cout-a-completer" }),
      rupture: routes.catalogue({ tab: "parfums", stock: "rupture" }),
      "stock-bas": routes.catalogue({ tab: "parfums", stock: "bas" }),
    },
    pipeline: {
      "en-attente": routes.commandes({ filtre: "en-attente" }),
      confirmees: routes.commandes({ filtre: "confirmees" }),
    },
    // Le bloc Argent mène à la Compta vue Ventes sur le mois : « periode=mois » est le défaut, l'URL reste nue.
    compta: routes.compta(),
    collect: routes.encaisser(),
    treasury: routes.compta({ vue: "tresorerie" }),
    recap: routes.journee(),
    stats: routes.statistiques(),
    deliverToday: routes.commandes({ filtre: "aujourdhui" }),
    deliverTomorrow: routes.commandes({ filtre: "demain" }),
    batches: lotsLivres ? { list: routes.lots(), create: routes.nouveauLot(), of: (id: string) => routes.lot(id) } : null,
    settings: isNavigable(routes.reglages()) ? routes.reglages() : null,
    perfumeOf: (perfumeId) => routes.parfum(perfumeId),
    steps: {
      // « Créer tes poches » ouvre S16 par la vue Trésorerie (la sheet n'a pas d'adresse propre, 06 §1.3).
      pockets: routes.compta({ vue: "tresorerie" }),
      perfume: routes.nouveauParfum(),
      sale: routes.vendre(),
    },
  };
}

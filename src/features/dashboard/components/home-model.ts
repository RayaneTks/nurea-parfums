/**
 * Décisions d'écran de l'Accueil, du Récap du jour et des Statistiques (06 E01, E02, E07) — pures et testées.
 *
 * Aucun chiffre n'est calculé ici : les montants et les compteurs arrivent de `src/server/chiffres` et de
 * `src/server/stats`. Ce module décide seulement de ce qui S'AFFICHE : quelles alertes existent, ce que
 * chacune ouvre, les libellés, et ce qui disparaît (05 §5.3 : « rien à faire ⇒ rien rendu »).
 */
import type { DashboardFiguresDTO } from "@/contracts/chiffres";
import type { DayRecapDTO, TodayDTO, TopPerfumeDTO } from "@/contracts/stats";
import { eur, eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import { OLD_RECEIVABLE_DAYS } from "@/domain/document-balance";

const isZero = (value: MoneyString) => eur.isZero(eurFromWire(value));

/** « 3 commandes » / « 1 commande » : le pluriel d'un compteur, une fois pour tout l'écran. */
export function plural(count: number, singular: string, plural_ = `${singular}s`): string {
  return `${count} ${count > 1 ? plural_ : singular}`;
}

// ── Zone 3 : « À faire » (06 E01) ──────────────────────────────────────────────

/**
 * Une rangée d'alerte. `hrefKey` nomme l'écran à ouvrir : la page fabrique l'URL par `routes.ts` (aucune URL
 * n'est écrite hors de ce module-là, 04 §2.2). `count` est le nombre AFFICHÉ, et l'écran ouvert doit en
 * compter autant — c'est l'invariant que le parcours e2e vérifie (05 §5.3).
 */
export type AlertKind = "retard" | "non-attribue" | "a-relancer" | "cout-a-completer" | "rupture" | "stock-bas";

export type AlertRow = {
  kind: AlertKind;
  label: string;
  /** Nombre compté ; `null` pour une alerte qui porte un montant plutôt qu'un compte. */
  count: number | null;
  /** Montant porté par l'alerte (« 120 € non attribués »). */
  amount: MoneyString | null;
  /** L'alerte n'ouvre pas un écran mais agit sur place (S15 « Répartir »). */
  actsInPlace: boolean;
};

/**
 * Les alertes à afficher, dans l'ordre d'urgence de 06 E01 zone 3. Une alerte à 0 n'existe pas : elle ne se
 * rend pas — le bloc entier disparaît quand il n'y a rien à faire (bonne nouvelle silencieuse).
 *
 * Rupture et stock bas sont DEUX rangées : « Stock bas » vaut 1 à 3, la rupture 0 (06 §1.7), et chaque lien
 * ouvre exactement ce qu'il compte.
 */
export function alertRows(figures: DashboardFiguresDTO): AlertRow[] {
  const rows: AlertRow[] = [];
  const add = (kind: AlertKind, label: string, count: number | null, amount: MoneyString | null = null, actsInPlace = false) =>
    rows.push({ kind, label, count, amount, actsInPlace });

  if (figures.enRetard > 0) add("retard", `${plural(figures.enRetard, "commande")} en retard`, figures.enRetard);
  if (!isZero(figures.tresorerie.unassigned)) {
    add("non-attribue", `${formatEur(eurFromWire(figures.tresorerie.unassigned), { compact: true })} non attribués`, null, figures.tresorerie.unassigned, true);
  }
  if (figures.clientsARelancer > 0) {
    add("a-relancer", `${plural(figures.clientsARelancer, "client")} à relancer · plus de ${OLD_RECEIVABLE_DAYS} j`, figures.clientsARelancer);
  }
  if (figures.coutACompleter > 0) {
    add("cout-a-completer", `${plural(figures.coutACompleter, "document")} au coût à compléter`, figures.coutACompleter);
  }
  if (figures.stock.out.count > 0) add("rupture", `${plural(figures.stock.out.count, "parfum")} en rupture`, figures.stock.out.count);
  if (figures.stock.low.count > 0) add("stock-bas", `${plural(figures.stock.low.count, "parfum")} en stock bas`, figures.stock.low.count);
  return rows;
}

// ── Zone 4 : « Aujourd'hui » (06 E01) ──────────────────────────────────────────

/** « 3 ventes · 1 commande prise » ; une part nulle est omise, et la légende entière avec elles. */
export function todayCaption(today: Pick<TodayDTO, "ventes" | "commandesPrises">): string | null {
  const parts: string[] = [];
  if (today.ventes > 0) parts.push(plural(today.ventes, "vente"));
  if (today.commandesPrises > 0) parts.push(`${plural(today.commandesPrises, "commande")} ${today.commandesPrises > 1 ? "prises" : "prise"}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * La carte « Aujourd'hui » a-t-elle un chiffre à montrer ? Oui dès qu'il y a quelque chose : de l'argent
 * encaissé, un document du jour, ou une livraison prévue aujourd'hui ou demain.
 *
 * Ce n'est PAS la condition d'existence de la carte (amendement J14-10 de 07) : elle est la seule porte vers
 * E02 et reste donc toujours rendue. Faux, elle dit « Rien encore aujourd'hui. » au lieu d'un « 0 € ».
 */
export function hasToday(today: TodayDTO): boolean {
  return (
    !isZero(today.encaisse) ||
    today.ventes > 0 ||
    today.commandesPrises > 0 ||
    today.aLivrerAujourdhui > 0 ||
    today.aLivrerDemain > 0
  );
}

// ── Zone 6 : pipeline des commandes (06 E01) ───────────────────────────────────

export type PipelineTile = { kind: "en-attente" | "confirmees"; label: string; count: number };

/** Une tuile à 0 disparaît ; le bloc disparaît si les deux valent 0 (06 E01 zone 6). */
export function pipelineTiles(commandes: DashboardFiguresDTO["commandes"]): PipelineTile[] {
  const tiles: PipelineTile[] = [];
  if (commandes.enAttente > 0) tiles.push({ kind: "en-attente", label: "En attente", count: commandes.enAttente });
  if (commandes.confirmees > 0) tiles.push({ kind: "confirmees", label: "Confirmées", count: commandes.confirmees });
  return tiles;
}

// ── Zone 8 et E07 : classement ─────────────────────────────────────────────────

/** « 12 flacons » : l'unité du classement, jamais un montant (06 E07). */
export function unitsLabel(units: number): string {
  return plural(units, "flacon");
}

/** « 84 flacons vendus · septembre » (06 E07, sous-titre). */
export function unitsSubtitle(totalUnits: number, period: string): string {
  return `${unitsLabel(totalUnits)} ${totalUnits > 1 ? "vendus" : "vendu"} · ${period}`;
}

/**
 * Largeur de la barre proportionnelle d'une ligne (06 E07), en pourcentage du premier rang : la barre compare
 * les lignes entre elles, pas au total. 100 % au rang 1 ; jamais moins de 2 % (une barre invisible ne dit rien).
 */
export function barWidth(units: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(2, Math.round((units / max) * 100));
}

/** Le maximum d'un classement, pour proportionner les barres. */
export function maxUnits(entries: readonly Pick<TopPerfumeDTO, "units">[]): number {
  return entries.reduce((best, entry) => Math.max(best, entry.units), 0);
}

// ── E02 : récap du jour ────────────────────────────────────────────────────────

/** « Vente · 2 articles », « Commande prise », « Commande livrée » (06 E02 zone 3). */
export function dayDocumentCaption(kind: DayRecapDTO["documents"][number]["kind"], itemCount: number): string {
  switch (kind) {
    case "vente":
      return `Vente · ${plural(itemCount, "article")}`;
    case "commande-prise":
      return "Commande prise";
    case "commande-livree":
      return "Commande livrée";
    default: {
      const exhaustive: never = kind;
      throw new Error(`Fait du jour inconnu : ${exhaustive as string}`);
    }
  }
}

/** Client de passage sans nom : le récap le nomme comme partout ailleurs (06 §1.7). */
export const PASSING_CUSTOMER = "Client de passage";

export const customerLabel = (name: string | null): string => name ?? PASSING_CUSTOMER;

/**
 * Le texte partagé par « Partager le récap » (06 E02, action principale) : date, Encaissé total et par poche,
 * nombre de ventes et de commandes, livraisons du lendemain, relances. Une section sans contenu est omise —
 * un récap n'invente pas une ligne vide (06 §3 « une ligne sans donnée vraie est omise »).
 */
export function shareRecapText(input: {
  dateLabel: string;
  recap: DayRecapDTO;
  /** Clients qui portent une créance ancienne, et leur total (même ensemble que l'alerte de E01). */
  relances: { clients: number; total: MoneyString };
}): string {
  const { dateLabel, recap, relances } = input;
  const lines: string[] = [`Récap du ${dateLabel}`];

  lines.push(`Encaissé : ${formatEur(eurFromWire(recap.encaisse))}`);
  for (const poche of recap.parPoche) {
    if (!isZero(poche.encaisse)) lines.push(`· ${poche.name} : ${formatEur(eurFromWire(poche.encaisse))}`);
  }

  const ventes = recap.documents.filter((doc) => doc.kind === "vente").length;
  const prises = recap.documents.filter((doc) => doc.kind === "commande-prise").length;
  const livrees = recap.documents.filter((doc) => doc.kind === "commande-livree").length;
  const activite = [
    ventes > 0 ? plural(ventes, "vente") : null,
    prises > 0 ? `${plural(prises, "commande")} ${prises > 1 ? "prises" : "prise"}` : null,
    livrees > 0 ? `${plural(livrees, "commande")} ${livrees > 1 ? "livrées" : "livrée"}` : null,
  ].filter(Boolean);
  if (activite.length > 0) lines.push(activite.join(" · "));

  if (recap.demain.length > 0) {
    lines.push(`À livrer demain : ${recap.demain.map((order) => customerLabel(order.customerName)).join(", ")}`);
  }
  if (relances.clients > 0) {
    lines.push(`À relancer : ${plural(relances.clients, "client")} · ${formatEur(eurFromWire(relances.total))}`);
  }
  return lines.join("\n");
}

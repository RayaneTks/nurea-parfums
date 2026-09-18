import "server-only";
import { Prisma } from "@prisma/client";
import { SERIES_BUCKET, type Period } from "@/contracts/chiffres";
import { OLD_RECEIVABLE_DAYS } from "@/domain/document-balance";

/**
 * LA copie applicative du SQL des chiffres (03 §5, 04 §6.2). Chaque définition est écrite UNE fois, sous forme
 * de fragment de LIGNES (`…RowsSql`) : les chiffres en sont des agrégats (`SUM`), les variantes le même
 * fragment sans `SUM`, filtré ou groupé (détail, par client, par lot, par poche, série) — jamais une réécriture.
 * Le composite de l'Accueil assemble ces fragments en CTE : un seul aller-retour (04 §6.3, §15 règle 1).
 *
 * Aucune dépendance à Next : `scripts/check-invariants.ts --chiffres` exécute ces fragments avec un client
 * Prisma simple. Les montants sortent en `numeric(12,2)::text`, lus par `dto.ts` (04 §5.3 règle 4).
 *
 * Le temps : toute borne métier (jour, semaine lundi, mois, année ; « en retard » ; créance ancienne) se
 * calcule ICI, par `nurea_period_start` / `nurea_period_end` en Europe/Paris (03 §5.1, 04 §6.5), à partir d'un
 * instant `now` fourni par l'appelant — l'horloge du serveur, celle qui date aussi les écritures et la clé de
 * cache du jour.
 */

// ── Socle (03 §5.1) ────────────────────────────────────────────────────────────

const ENGAGED = Prisma.sql`('CONFIRMED', 'DELIVERED')`;

/** Filtre facultatif `AND <colonne> = <valeur>` (NULL = sans filtre, 03 §5). */
function equals(column: Prisma.Sql, value: string | null | undefined): Prisma.Sql {
  return value === null || value === undefined ? Prisma.empty : Prisma.sql`AND ${column} = ${value}`;
}

export type Bounds = { from: Prisma.Sql; to: Prisma.Sql };

/**
 * Bornes `[from, to[` d'une période, en expressions SQL `timestamptz`. « Depuis toujours » : `-infinity`,
 * `infinity`. Une période calendaire part de son jour de référence (00:00 à Paris) ou de `now`, décalée
 * d'un nombre entier d'unités sur le calendrier de Paris (jamais en millisecondes : un jour dure 23 ou 25 h).
 */
export function boundsSql(period: Period, now: Date): Bounds {
  switch (period.kind) {
    case "all":
      return { from: Prisma.sql`'-infinity'::timestamptz`, to: Prisma.sql`'infinity'::timestamptz` };
    case "range":
      return { from: Prisma.sql`${new Date(period.from)}::timestamptz`, to: Prisma.sql`${new Date(period.to)}::timestamptz` };
    case "calendar": {
      const unit = period.unit;
      const ref =
        period.ref === null
          ? Prisma.sql`${now}::timestamptz`
          : Prisma.sql`(${period.ref}::date::timestamp AT TIME ZONE 'Europe/Paris')`;
      const shifted =
        period.offset === 0
          ? ref
          : Prisma.sql`((nurea_period_start(${unit}::text, ${ref}) AT TIME ZONE 'Europe/Paris')
                         + ${period.offset}::int * ${`1 ${unit}`}::interval) AT TIME ZONE 'Europe/Paris'`;
      return {
        from: Prisma.sql`nurea_period_start(${unit}::text, ${shifted})`,
        to: Prisma.sql`nurea_period_end(${unit}::text, ${shifted})`,
      };
    }
    default: {
      const _exhaustive: never = period;
      throw new Error(`Période inconnue : ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/** 00:00 du jour courant à Paris (« en retard », 03 §5.6). */
function startOfTodaySql(now: Date): Prisma.Sql {
  return Prisma.sql`nurea_period_start('day', ${now}::timestamptz)`;
}

/**
 * Seuil d'une créance ancienne (03 §5.8) : début du jour moins 30 jours calendaires, arithmétique en heure
 * locale de Paris puis retour en `timestamptz`.
 */
function oldReceivableThresholdSql(now: Date): Prisma.Sql {
  return Prisma.sql`(((${startOfTodaySql(now)} AT TIME ZONE 'Europe/Paris') - ${OLD_RECEIVABLE_DAYS}::int * interval '1 day')
                      AT TIME ZONE 'Europe/Paris')`;
}

/** Portée d'un chiffre de flux : période, et lot ou client facultatifs. */
export type FlowScope = { period: Period; now: Date; batchId?: string | null; customerId?: string | null };

// ── Encaissé (03 §5.2) ─────────────────────────────────────────────────────────

/**
 * Lignes de l'Encaissé : les mouvements `PAYMENT` de la période (entrées moins remboursements, à la date du
 * paiement), quel que soit le statut du document — un acompte conservé sur une commande annulée compte.
 */
export function encaisseRowsSql(scope: FlowScope): Prisma.Sql {
  const { from, to } = boundsSql(scope.period, scope.now);
  return Prisma.sql`
    SELECT m.id AS "movementId", m.amount, m."occurredAt", m."pocketId",
           d.id AS "documentId", d."batchId", d."customerId"
    FROM "CashMovement" m
    JOIN "Payment"      p ON p."movementId" = m.id
    JOIN "SaleDocument" d ON d.id = p."documentId"
    WHERE m.kind = 'PAYMENT'
      AND m."occurredAt" >= ${from} AND m."occurredAt" < ${to}
      ${equals(Prisma.sql`d."batchId"`, scope.batchId)}
      ${equals(Prisma.sql`d."customerId"`, scope.customerId)}`;
}

export function encaisseSql(scope: FlowScope): Prisma.Sql {
  return Prisma.sql`SELECT COALESCE(SUM(e.amount), 0)::numeric(12,2)::text AS encaisse FROM (${encaisseRowsSql(scope)}) e`;
}

/** Encaissé ventilé par poche (E02), mêmes lignes. */
export function encaisseParPocheSql(scope: FlowScope): Prisma.Sql {
  return Prisma.sql`
    SELECT p.id AS "pocketId", p.name, p."isSystem", SUM(e.amount)::numeric(12,2)::text AS encaisse
    FROM (${encaisseRowsSql(scope)}) e
    JOIN "Pocket" p ON p.id = e."pocketId"
    GROUP BY p.id
    ORDER BY p."isSystem", p."sortOrder", p.name, p.id`;
}

/**
 * Série « Encaissé par … » (E03 zone 3) : une ligne par pas calendaire (SERIES_BUCKET), vides comprises, chaque
 * pas borné à la période — la somme des points est exactement l'Encaissé de la période. « Depuis toujours » va
 * du mois du premier paiement au mois courant (aucun point sans paiement). Pas calculés sur l'heure murale de
 * Paris : minuit existe toujours et une seule fois.
 */
export function encaisseSerieSql(period: Period, now: Date): Prisma.Sql {
  if (period.kind === "range") throw new TypeError("Série : période calendaire ou « depuis toujours » attendue.");
  const bucket = SERIES_BUCKET[period.kind === "all" ? "all" : period.unit];
  const step = `1 ${bucket}`;
  const rows = encaisseRowsSql({ period, now });
  const window =
    period.kind === "all"
      ? Prisma.sql`SELECT nurea_period_start('month', MIN(e."occurredAt")) AS "from",
                          nurea_period_end('month', GREATEST(${now}::timestamptz, MAX(e."occurredAt"))) AS "to"
                   FROM (${rows}) e`
      : (() => {
          const { from, to } = boundsSql(period, now);
          return Prisma.sql`SELECT ${from} AS "from", ${to} AS "to"`;
        })();
  return Prisma.sql`
    WITH bornes AS (${window}),
    pas AS (
      SELECT GREATEST(g.mur AT TIME ZONE 'Europe/Paris', bornes."from") AS "from",
             LEAST((g.mur + ${step}::interval) AT TIME ZONE 'Europe/Paris', bornes."to") AS "to"
      FROM bornes
      CROSS JOIN LATERAL generate_series(
        nurea_period_start(${bucket}::text, bornes."from") AT TIME ZONE 'Europe/Paris',
        (bornes."to" AT TIME ZONE 'Europe/Paris') - interval '1 microsecond',
        ${step}::interval
      ) AS g(mur)
    )
    SELECT pas."from", pas."to", COALESCE(SUM(e.amount), 0)::numeric(12,2)::text AS encaisse
    FROM pas
    LEFT JOIN (${rows}) e ON e."occurredAt" >= pas."from" AND e."occurredAt" < pas."to"
    GROUP BY pas."from", pas."to"
    ORDER BY pas."from"`;
}

// ── À encaisser et créances (03 §5.3, §5.8) ────────────────────────────────────

/**
 * Lignes d'À encaisser : chaque document engagé (confirmé ou livré, non annulé) avec son dû plafonné par
 * document (vue `DocumentBalance`). Une commande `PENDING` n'est pas une créance. Colonnes d'écran : nom,
 * clé de regroupement (fiche liée, sinon nom saisi), âge en jours calendaires de Paris, ancienneté.
 */
export function aEncaisserRowsSql(scope: { now: Date; batchId?: string | null; customerId?: string | null }): Prisma.Sql {
  return Prisma.sql`
    SELECT b."documentId", b.origin, b.status, b."customerId",
           COALESCE(c."fullName", d."customerName") AS "customerName",
           CASE WHEN b."customerId" IS NOT NULL THEN 'fiche:' || b."customerId"
                ELSE 'nom:' || lower(btrim(COALESCE(d."customerName", ''))) END AS "customerKey",
           b."batchId", b.total, b.paid, b.due, d."orderedAt", b."confirmedAt", b."deliveredAt",
           ((${startOfTodaySql(scope.now)} AT TIME ZONE 'Europe/Paris')::date
             - (b."confirmedAt" AT TIME ZONE 'Europe/Paris')::date) AS "ageDays",
           (b."confirmedAt" < ${oldReceivableThresholdSql(scope.now)}) AS "isOld"
    FROM "DocumentBalance" b
    JOIN "SaleDocument" d ON d.id = b."documentId"
    LEFT JOIN "Customer" c ON c.id = b."customerId"
    WHERE b.status IN ${ENGAGED}
      ${equals(Prisma.sql`b."batchId"`, scope.batchId)}
      ${equals(Prisma.sql`b."customerId"`, scope.customerId)}`;
}

export function aEncaisserSql(scope: { now: Date; batchId?: string | null; customerId?: string | null }): Prisma.Sql {
  return Prisma.sql`SELECT COALESCE(SUM(r.due), 0)::numeric(12,2)::text AS "aEncaisser" FROM (${aEncaisserRowsSql(scope)}) r`;
}

/**
 * Créances : les lignes d'À encaisser à dû > 0, plus anciennes d'abord (E13). `oldOnly` : les créances
 * anciennes seulement (03 §5.8 : engagées il y a plus de 30 jours calendaires).
 */
export function receivablesSql(now: Date, options: { oldOnly?: boolean } = {}): Prisma.Sql {
  return Prisma.sql`
    SELECT r."documentId", r.origin::text AS origin, r.status::text AS status, r."customerId", r."customerName",
           r."customerKey", r."batchId", r.total::text AS total, r.paid::text AS paid, r.due::text AS due,
           r."orderedAt", r."confirmedAt", r."deliveredAt", r."ageDays", r."isOld"
    FROM (${aEncaisserRowsSql({ now })}) r
    WHERE r.due > 0 ${options.oldOnly ? Prisma.sql`AND r."isOld"` : Prisma.empty}
    ORDER BY r."confirmedAt", r."documentId"`;
}

/** À encaisser par fiche client (badges de E12, recherche S17) ; les clients de passage n'ont pas de fiche. */
export function aEncaisserParClientSql(now: Date): Prisma.Sql {
  return Prisma.sql`
    SELECT r."customerId", SUM(r.due)::numeric(12,2)::text AS "aEncaisser"
    FROM (${aEncaisserRowsSql({ now })}) r
    WHERE r."customerId" IS NOT NULL
    GROUP BY r."customerId"
    HAVING SUM(r.due) > 0
    ORDER BY r."customerId"`;
}

// ── Marge nette (03 §5.4) ──────────────────────────────────────────────────────

/**
 * Lignes des coûts : documents engagés (`CONFIRMED`, `DELIVERED`) dont l'engagement `confirmedAt` tombe dans la
 * période ; coûts inconnus comptés 0 et signalés.
 */
export function coutsRowsSql(scope: { period: Period; now: Date; batchId?: string | null }): Prisma.Sql {
  const { from, to } = boundsSql(scope.period, scope.now);
  return Prisma.sql`
    SELECT b."documentId", b."batchId", b.cost, b."hasUnknownCost", b."confirmedAt"
    FROM "DocumentBalance" b
    WHERE b.status IN ${ENGAGED}
      AND b."confirmedAt" >= ${from} AND b."confirmedAt" < ${to}
      ${equals(Prisma.sql`b."batchId"`, scope.batchId)}`;
}

/**
 * Lignes des dépenses de lot, en montants positifs, datées par leur mouvement. Une contre-passation rejoint sa
 * dépense par `reversesId`, à la même date : une dépense supprimée disparaît de sa période.
 */
export function depensesRowsSql(scope: { period: Period; now: Date; batchId?: string | null }): Prisma.Sql {
  const { from, to } = boundsSql(scope.period, scope.now);
  return Prisma.sql`
    SELECT m.id AS "movementId", -m.amount AS amount, m."occurredAt", e.id AS "expenseId", e."batchId"
    FROM "CashMovement" m
    JOIN "BatchExpense" e ON e."movementId" = COALESCE(m."reversesId", m.id)
    WHERE m.kind = 'EXPENSE'
      AND m."occurredAt" >= ${from} AND m."occurredAt" < ${to}
      ${equals(Prisma.sql`e."batchId"`, scope.batchId)}`;
}

/**
 * LA formule de la Marge nette, en un objet JSON : Encaissé − coûts − dépenses, composantes comprises.
 * `encaisse`, `couts`, `depenses` : expressions numériques ; `inconnus` : nombre de documents au coût inconnu.
 */
function margeNetteObjectSql(parts: { encaisse: Prisma.Sql; couts: Prisma.Sql; depenses: Prisma.Sql; inconnus: Prisma.Sql }): Prisma.Sql {
  return Prisma.sql`json_build_object(
    'encaisse',      (${parts.encaisse})::numeric(12,2)::text,
    'couts',         (${parts.couts})::numeric(12,2)::text,
    'depenses',      (${parts.depenses})::numeric(12,2)::text,
    'margeNette',    ((${parts.encaisse}) - (${parts.couts}) - (${parts.depenses}))::numeric(12,2)::text,
    'coutsInconnus', (${parts.inconnus})::int)`;
}

/** Marge nette d'un périmètre : globale, lot, période, lot × période. Pas d'échelle client (03 §5.4). */
export function margeNetteSql(scope: { period: Period; now: Date; batchId?: string | null }): Prisma.Sql {
  return Prisma.sql`
    WITH encaisse AS (SELECT COALESCE(SUM(e.amount), 0) AS v FROM (${encaisseRowsSql(scope)}) e),
    couts AS (
      SELECT COALESCE(SUM(c.cost), 0) AS v, count(*) FILTER (WHERE c."hasUnknownCost") AS inconnus
      FROM (${coutsRowsSql(scope)}) c
    ),
    depenses AS (SELECT COALESCE(SUM(x.amount), 0) AS v FROM (${depensesRowsSql(scope)}) x)
    SELECT ${margeNetteObjectSql({ encaisse: Prisma.sql`encaisse.v`, couts: Prisma.sql`couts.v`, depenses: Prisma.sql`depenses.v`, inconnus: Prisma.sql`couts.inconnus` })} AS "margeNette"
    FROM encaisse, couts, depenses`;
}

/** Documents engagés au coût à compléter d'une période : exactement les coûts comptés 0 de sa Marge nette. */
export function coutACompleterSql(scope: { period: Period; now: Date; batchId?: string | null }): Prisma.Sql {
  return Prisma.sql`
    SELECT c."documentId" FROM (${coutsRowsSql(scope)}) c
    WHERE c."hasUnknownCost"
    ORDER BY c."confirmedAt", c."documentId"`;
}

/** Chiffres de chaque lot (E05) : les mêmes lignes, groupées par lot. */
export function chiffresParLotSql(period: Period, now: Date): Prisma.Sql {
  const scope = { period, now };
  return Prisma.sql`
    WITH encaisse AS (SELECT e."batchId", SUM(e.amount) AS v FROM (${encaisseRowsSql(scope)}) e GROUP BY e."batchId"),
    a_encaisser AS (SELECT r."batchId", SUM(r.due) AS v FROM (${aEncaisserRowsSql({ now })}) r GROUP BY r."batchId"),
    couts AS (
      SELECT c."batchId", SUM(c.cost) AS v, count(*) FILTER (WHERE c."hasUnknownCost") AS inconnus
      FROM (${coutsRowsSql(scope)}) c GROUP BY c."batchId"
    ),
    depenses AS (SELECT x."batchId", SUM(x.amount) AS v FROM (${depensesRowsSql(scope)}) x GROUP BY x."batchId")
    SELECT l.id AS "batchId",
           COALESCE(a_encaisser.v, 0)::numeric(12,2)::text AS "aEncaisser",
           ${margeNetteObjectSql({
             encaisse: Prisma.sql`COALESCE(encaisse.v, 0)`,
             couts: Prisma.sql`COALESCE(couts.v, 0)`,
             depenses: Prisma.sql`COALESCE(depenses.v, 0)`,
             inconnus: Prisma.sql`COALESCE(couts.inconnus, 0)`,
           })} AS "margeNette"
    FROM "Batch" l
    LEFT JOIN encaisse    ON encaisse."batchId"    = l.id
    LEFT JOIN a_encaisser ON a_encaisser."batchId" = l.id
    LEFT JOIN couts       ON couts."batchId"       = l.id
    LEFT JOIN depenses    ON depenses."batchId"    = l.id
    ORDER BY l.id`;
}

// ── Trésorerie (03 §5.5) ───────────────────────────────────────────────────────

/** Lignes de la Trésorerie : chaque poche active et son solde (ouverture + mouvements signés). */
export function tresorerieRowsSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT p.id, p.name, p.kind, p."isSystem", p."sortOrder", p."openingBalance",
           (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2) AS solde
    FROM "Pocket" p
    LEFT JOIN "CashMovement" m ON m."pocketId" = p.id
    WHERE NOT p.archived
    GROUP BY p.id`;
}

/** Trésorerie = Σ soldes ; « non attribué » = solde de la poche système. Ordre choisi, système en dernier. */
export function tresorerieSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT t.id, t.name, t.kind::text AS kind, t."isSystem", t."sortOrder",
           t."openingBalance"::numeric(12,2)::text AS "openingBalance", t.solde::text AS balance,
           (SUM(t.solde) OVER ())::numeric(12,2)::text AS total,
           COALESCE(SUM(t.solde) FILTER (WHERE t."isSystem") OVER (), 0)::numeric(12,2)::text AS unassigned
    FROM (${tresorerieRowsSql()}) t
    ORDER BY t."isSystem", t."sortOrder", t.name, t.id`;
}

// ── En retard (03 §5.6) ────────────────────────────────────────────────────────

/** Document à livrer dont la livraison prévue précède 00:00 (Paris) du jour : ni livré ni annulé. */
export function enRetardRowsSql(now: Date): Prisma.Sql {
  return Prisma.sql`
    SELECT d.id AS "documentId", d."expectedDeliveryAt"
    FROM "SaleDocument" d
    WHERE d.status IN ('PENDING', 'CONFIRMED')
      AND d."expectedDeliveryAt" < ${startOfTodaySql(now)}`;
}

export function enRetardSql(now: Date): Prisma.Sql {
  return Prisma.sql`SELECT r."documentId" FROM (${enRetardRowsSql(now)}) r ORDER BY r."expectedDeliveryAt", r."documentId"`;
}

// ── Documents ──────────────────────────────────────────────────────────────────

/** Colonnes de la vue pour des documents donnés (fiche document, S01). */
export function documentBalanceSql(ids: readonly string[]): Prisma.Sql {
  return Prisma.sql`
    SELECT b."documentId", b.status::text AS status, b.origin::text AS origin, b."customerId", b."batchId",
           b."confirmedAt", b."deliveredAt", b.total::text AS total, b.cost::text AS cost, b.paid::text AS paid,
           b.due::text AS due, b."hasUnknownCost"
    FROM "DocumentBalance" b
    WHERE b."documentId" = ANY(${[...ids]}::text[])
    ORDER BY b."documentId"`;
}

/**
 * Documents d'une période (E03 zone 5) : un paiement dans la période (lignes de l'Encaissé) ou un engagement
 * dans la période (lignes des coûts).
 */
export function documentsDeLaPeriodeSql(period: Period, now: Date): Prisma.Sql {
  const scope = { period, now };
  return Prisma.sql`
    SELECT x."documentId" FROM (
      SELECT e."documentId" FROM (${encaisseRowsSql(scope)}) e
      UNION
      SELECT c."documentId" FROM (${coutsRowsSql(scope)}) c
    ) x
    ORDER BY x."documentId"`;
}

/** Commandes à livrer (E01 zone 6, chips de E10) : en attente ou confirmées. */
function commandesALivrerRowsSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT d.id AS "documentId", d.status
    FROM "SaleDocument" d
    WHERE d.origin = 'ORDER' AND d.status IN ('PENDING', 'CONFIRMED')`;
}

// ── Accueil (04 §6.3, A-13, 06 E01) ────────────────────────────────────────────

/**
 * Le composite de l'Accueil, en UNE requête : Encaissé et Marge nette du mois (jamais d'Encaissé depuis
 * toujours), Encaissé du jour (bloc « Aujourd'hui », 06 E01 zone 4), À encaisser et Trésorerie à date, et les
 * compteurs de E01 — chacun par le fragment de sa définition.
 */
export function tableauDeBordSql(now: Date): Prisma.Sql {
  const month: Period = { kind: "calendar", unit: "month", ref: null, offset: 0 };
  const day: Period = { kind: "calendar", unit: "day", ref: null, offset: 0 };
  const all: Period = { kind: "all" };
  const { from, to } = boundsSql(month, now);
  return Prisma.sql`
    WITH encaisse_mois AS (SELECT COALESCE(SUM(e.amount), 0) AS v FROM (${encaisseRowsSql({ period: month, now })}) e),
    encaisse_jour AS (SELECT COALESCE(SUM(e.amount), 0) AS v FROM (${encaisseRowsSql({ period: day, now })}) e),
    couts_mois AS (
      SELECT COALESCE(SUM(c.cost), 0) AS v, count(*) FILTER (WHERE c."hasUnknownCost") AS inconnus
      FROM (${coutsRowsSql({ period: month, now })}) c
    ),
    depenses_mois AS (SELECT COALESCE(SUM(x.amount), 0) AS v FROM (${depensesRowsSql({ period: month, now })}) x),
    a_encaisser AS (SELECT COALESCE(SUM(r.due), 0) AS v FROM (${aEncaisserRowsSql({ now })}) r),
    tresorerie AS (
      SELECT COALESCE(SUM(t.solde), 0) AS total, COALESCE(SUM(t.solde) FILTER (WHERE t."isSystem"), 0) AS unassigned
      FROM (${tresorerieRowsSql()}) t
    ),
    en_retard AS (SELECT count(*)::int AS n FROM (${enRetardRowsSql(now)}) r),
    a_relancer AS (
      SELECT count(DISTINCT r."customerKey")::int AS n
      FROM (${aEncaisserRowsSql({ now })}) r
      WHERE r.due > 0 AND r."isOld"
    ),
    cout_a_completer AS (SELECT count(*)::int AS n FROM (${coutsRowsSql({ period: all, now })}) c WHERE c."hasUnknownCost"),
    commandes AS (
      SELECT count(*) FILTER (WHERE o.status = 'PENDING')::int AS en_attente,
             count(*) FILTER (WHERE o.status = 'CONFIRMED')::int AS confirmees
      FROM (${commandesALivrerRowsSql()}) o
    )
    SELECT ${from} AS "monthFrom", ${to} AS "monthTo",
           encaisse_mois.v::numeric(12,2)::text AS "encaisseMois",
           encaisse_jour.v::numeric(12,2)::text AS "encaisseJour",
           ${margeNetteObjectSql({
             encaisse: Prisma.sql`encaisse_mois.v`,
             couts: Prisma.sql`couts_mois.v`,
             depenses: Prisma.sql`depenses_mois.v`,
             inconnus: Prisma.sql`couts_mois.inconnus`,
           })} AS "margeNetteMois",
           a_encaisser.v::numeric(12,2)::text AS "aEncaisser",
           tresorerie.total::numeric(12,2)::text AS "tresorerieTotal",
           tresorerie.unassigned::numeric(12,2)::text AS "tresorerieUnassigned",
           en_retard.n AS "enRetard",
           a_relancer.n AS "clientsARelancer",
           cout_a_completer.n AS "coutACompleter",
           commandes.en_attente AS "commandesEnAttente",
           commandes.confirmees AS "commandesConfirmees"
    FROM encaisse_mois, encaisse_jour, couts_mois, depenses_mois, a_encaisser, tresorerie, en_retard, a_relancer,
         cout_a_completer, commandes`;
}

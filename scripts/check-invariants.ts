/**
 * `npm run check:invariants` — les invariants de l'argent vérifiables en une requête
 * (docs/refonte/03-MODELE-DONNEES.md §5.7), en lecture seule :
 *
 *   1. Σ payé de tous les documents (vue `DocumentBalance`) = Σ des mouvements `PAYMENT` ;
 *   2. chaque groupe de transfert compte deux jambes de somme nulle ;
 *   3. toute poche archivée a un solde nul.
 *
 * `--chiffres` (07 J7) : affiche en plus les chiffres canoniques — Trésorerie, Encaissé depuis toujours, À encaisser,
 * Marge nette, chiffres du mois et compteurs de l'Accueil — calculés par les fragments de `src/server/chiffres/sql.ts`,
 * les mêmes que ceux des écrans, avec un client Prisma simple, hors Next. Seulement des agrégats : ni nom de client
 * ni nom de poche. `--rapport <rapport.json>` : les confronte, au centime, à C1 (Trésorerie et non attribué), C3
 * (Encaissé) et C4 (À encaisser) d'un rapport de reprise (07 §2.5).
 *
 * Cible : `DATABASE_URL`, lue AVANT l'import de Prisma — qui chargerait sinon `.env`, c'est-à-dire la
 * production. Sans variable : refus. Production : `--confirm-host <hôte>` exigé (garde partagée des scripts).
 * Sortie 0 si tout est vert, 1 sinon.
 *
 *   DATABASE_URL=postgresql://nurea:nurea@localhost:54329/nurea_test npm run check:invariants
 *   DATABASE_URL=… npx tsx scripts/check-invariants.ts --chiffres --rapport migration-artifacts/<jour>/<répétition>/rapport.json
 */
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { eurFromDb, formatEur, toWire } from "@/domain/money";
// Types seuls : effacés à l'exécution, ils ne chargent ni le module serveur ni Prisma.
import type { DashboardRow, MargeNetteJson, ReceivableRow, TresorerieRow } from "@/server/chiffres/dto";
import { HostRefusedError, assertHostConfirmed, hostOf } from "./lib/garde-hote";

// Lu avant tout import de @prisma/client.
const DATABASE_URL = process.env.DATABASE_URL;

/** Client de requêtes brutes : un `PrismaClient` ou le client d'une transaction. */
export type InvariantReader = Pick<PrismaClient, "$queryRawUnsafe">;

export type InvariantResult = {
  name: string;
  ok: boolean;
  /** Une ligne par écart, lisible telle quelle. */
  details: string[];
};

type Invariant = { name: string; check: (db: InvariantReader) => Promise<string[]> };

export const INVARIANTS: readonly Invariant[] = [
  {
    name: "Σ payé des documents = Σ des mouvements PAYMENT",
    async check(db) {
      const [row] = await db.$queryRawUnsafe<{ paid: string; movements: string }[]>(
        `SELECT (SELECT COALESCE(SUM(paid), 0) FROM "DocumentBalance")::numeric(14,2)::text AS paid,
                (SELECT COALESCE(SUM(amount), 0) FROM "CashMovement" WHERE kind = 'PAYMENT')::numeric(14,2)::text AS movements`,
      );
      return row && row.paid === row.movements ? [] : [`payé ${row?.paid} € ≠ mouvements PAYMENT ${row?.movements} €`];
    },
  },
  {
    name: "chaque transfert a deux jambes de somme nulle",
    async check(db) {
      const rows = await db.$queryRawUnsafe<{ group: string; legs: number; total: string }[]>(
        `SELECT "transferGroupId" AS "group", count(*)::int AS legs, SUM(amount)::numeric(14,2)::text AS total
         FROM "CashMovement"
         WHERE kind = 'TRANSFER'
         GROUP BY "transferGroupId"
         HAVING count(*) <> 2 OR SUM(amount) <> 0
         ORDER BY "transferGroupId"`,
      );
      return rows.map((row) => `transfert ${row.group} : ${row.legs} jambe(s), somme ${row.total} €`);
    },
  },
  {
    name: "toute poche archivée a un solde nul",
    async check(db) {
      const rows = await db.$queryRawUnsafe<{ id: string; name: string; balance: string }[]>(
        `SELECT p.id, p.name, (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(14,2)::text AS balance
         FROM "Pocket" p
         LEFT JOIN "CashMovement" m ON m."pocketId" = p.id
         WHERE p.archived
         GROUP BY p.id
         HAVING p."openingBalance" + COALESCE(SUM(m.amount), 0) <> 0
         ORDER BY p.id`,
      );
      return rows.map((row) => `poche archivée « ${row.name} » (${row.id}) : solde ${row.balance} €`);
    },
  },
];

export async function checkInvariants(db: InvariantReader): Promise<InvariantResult[]> {
  const results: InvariantResult[] = [];
  for (const invariant of INVARIANTS) {
    const details = await invariant.check(db);
    results.push({ name: invariant.name, ok: details.length === 0, details });
  }
  return results;
}

// ── Chiffres canoniques (--chiffres) ───────────────────────────────────────────

/** Client de lecture des fragments `Prisma.Sql` : un `PrismaClient` ou le client d'une transaction. */
export type ChiffresReader = Pick<PrismaClient, "$queryRaw">;

export type ChiffresCanoniques = {
  /** Horloge de référence des chiffres datés. */
  now: string;
  tresorerie: { total: string; unassigned: string; pockets: number };
  encaisseDepuisToujours: string;
  aEncaisser: string;
  margeNetteDepuisToujours: { value: string; costs: string; expenses: string; unknownCostCount: number };
  mois: { from: string; to: string; encaisse: string; margeNette: string; percent: string | null };
  creances: { documents: number; anciennes: number };
  enRetard: number;
  clientsARelancer: number;
  coutACompleter: number;
  commandes: { enAttente: number; confirmees: number };
};

/**
 * Les chiffres canoniques par les fragments de `src/server/chiffres/sql.ts`. Import différé : le module de
 * fragments charge `@prisma/client`, jamais avant que la cible ait été lue et vérifiée.
 */
export async function computeChiffres(db: ChiffresReader, now: Date = new Date()): Promise<ChiffresCanoniques> {
  const sql = await import("@/server/chiffres/sql");
  const dto = await import("@/server/chiffres/dto");
  const all = { kind: "all" } as const;
  const tresorerie = dto.tresorerieDto(await db.$queryRaw<TresorerieRow[]>(sql.tresorerieSql()));
  const encaisse = dto.encaisseDto(await db.$queryRaw<{ encaisse: string }[]>(sql.encaisseSql({ period: all, now })));
  const aEncaisser = dto.aEncaisserDto(await db.$queryRaw<{ aEncaisser: string }[]>(sql.aEncaisserSql({ now })));
  const [marge] = await db.$queryRaw<{ margeNette: MargeNetteJson }[]>(sql.margeNetteSql({ period: all, now }));
  const margeNette = dto.margeNetteDto(marge?.margeNette as MargeNetteJson);
  const receivables = await db.$queryRaw<ReceivableRow[]>(sql.receivablesSql(now));
  const dashboard = dto.tableauDeBordDto(await db.$queryRaw<DashboardRow[]>(sql.tableauDeBordSql(now)));
  return {
    now: now.toISOString(),
    tresorerie: { total: tresorerie.total, unassigned: tresorerie.unassigned, pockets: tresorerie.pockets.length },
    encaisseDepuisToujours: encaisse,
    aEncaisser,
    margeNetteDepuisToujours: {
      value: margeNette.value,
      costs: margeNette.costs,
      expenses: margeNette.expenses,
      unknownCostCount: margeNette.unknownCostCount,
    },
    mois: {
      ...dashboard.month,
      encaisse: dashboard.encaisseMois,
      margeNette: dashboard.margeNetteMois.value,
      percent: dashboard.margeNetteMois.percent,
    },
    creances: { documents: receivables.length, anciennes: receivables.filter((row) => row.isOld === true).length },
    enRetard: dashboard.enRetard,
    clientsARelancer: dashboard.clientsARelancer,
    coutACompleter: dashboard.coutACompleter,
    commandes: dashboard.commandes,
  };
}

export type RapportReference = { tresorerie: string; nonAttribue: string; encaisse: string; aEncaisser: string };

/** C1, C3 et C4 d'un `rapport.json` de reprise (format `nurea-rapport-reprise/1`, 07 §2.5). */
export function referenceFromRapport(rapport: unknown): RapportReference {
  const controles = (rapport as { controles?: { code: string; valeurs: Record<string, string | number> }[] }).controles ?? [];
  const valeur = (code: string, cle: string): string => {
    const value = controles.find((controle) => controle.code === code)?.valeurs[cle];
    if (typeof value !== "string") throw new Error(`Rapport de reprise : ${code}.valeurs.${cle} introuvable.`);
    return value;
  };
  return {
    tresorerie: valeur("C1", "totalNonArchivees"),
    nonAttribue: valeur("C1", "nonAttribue"),
    encaisse: valeur("C3", "encaisseNouveau"),
    aEncaisser: valeur("C4", "recalcule"),
  };
}

/** Chiffres canoniques confrontés au rapport, au centime, un résultat par chiffre. */
export function compareWithRapport(chiffres: ChiffresCanoniques, reference: RapportReference): { label: string; ok: boolean; line: string }[] {
  const pairs: [string, string, string][] = [
    ["Trésorerie (C1)", chiffres.tresorerie.total, reference.tresorerie],
    ["Non attribué (C1)", chiffres.tresorerie.unassigned, reference.nonAttribue],
    ["Encaissé depuis toujours (C3)", chiffres.encaisseDepuisToujours, reference.encaisse],
    ["À encaisser (C4)", chiffres.aEncaisser, reference.aEncaisser],
  ];
  return pairs.map(([label, actual, expected]) => {
    // Forme canonique à deux décimales des deux côtés : « 825.0 » et « 825.00 » sont le même montant.
    const ok = toWire(eurFromDb(actual)) === toWire(eurFromDb(expected));
    return { label, ok, line: `${label} : ${eur(actual)} — rapport ${eur(expected)}` };
  });
}

const eur = (text: string) => formatEur(eurFromDb(text));

const documents = (n: number) => `${n} document${n > 1 ? "s" : ""}`;

function printChiffres(chiffres: ChiffresCanoniques): void {
  const pad = (label: string) => label.padEnd(34, " ");
  console.log(`Chiffres canoniques (03 §5, src/server/chiffres/sql.ts) — horloge ${chiffres.now}`);
  console.log(`  ${pad("Trésorerie")}${eur(chiffres.tresorerie.total)}  (${chiffres.tresorerie.pockets} poches actives · non attribué ${eur(chiffres.tresorerie.unassigned)})`);
  console.log(`  ${pad("Encaissé depuis toujours")}${eur(chiffres.encaisseDepuisToujours)}`);
  console.log(`  ${pad("À encaisser")}${eur(chiffres.aEncaisser)}  (${documents(chiffres.creances.documents)}, dont ${chiffres.creances.anciennes} en créance ancienne)`);
  const marge = chiffres.margeNetteDepuisToujours;
  console.log(
    `  ${pad("Marge nette depuis toujours")}${eur(marge.value)}  (coûts d'achat ${eur(marge.costs)} · dépenses ${eur(marge.expenses)} · ${documents(marge.unknownCostCount)} au coût à compléter)`,
  );
  console.log(`  ${pad(`Encaissé du mois`)}${eur(chiffres.mois.encaisse)}  ([${chiffres.mois.from} ; ${chiffres.mois.to}[)`);
  console.log(`  ${pad("Marge nette du mois")}${eur(chiffres.mois.margeNette)}${chiffres.mois.percent === null ? "" : `  (${chiffres.mois.percent} %)`}`);
  console.log(`  ${pad("En retard")}${chiffres.enRetard}`);
  console.log(`  ${pad("Clients à relancer")}${chiffres.clientsARelancer}`);
  console.log(`  ${pad("Documents au coût à compléter")}${chiffres.coutACompleter}`);
  console.log(`  ${pad("Commandes en attente · confirmées")}${chiffres.commandes.enAttente} · ${chiffres.commandes.confirmees}`);
}

/**
 * Les modules serveur commencent par `import "server-only"`, qui lève hors de la condition `react-server`. Les
 * fragments SQL n'ont rien de React : on les charge ici avec un module vide à la place du marqueur, sans exiger
 * `--conditions=react-server` à la ligne de commande.
 */
function allowServerModules(): void {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
}

// ── Ligne de commande ──────────────────────────────────────────────────────────

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<number> {
  if (!DATABASE_URL) {
    console.error("check:invariants : DATABASE_URL requise (jamais lue dans .env, qui désigne la production).");
    return 1;
  }
  const url = assertHostConfirmed(DATABASE_URL, argument("--confirm-host"), "check:invariants");
  const withChiffres = process.argv.includes("--chiffres");
  const rapportPath = argument("--rapport");
  if (rapportPath && !withChiffres) {
    console.error("check:invariants : --rapport compare les chiffres canoniques, ajoute --chiffres.");
    return 1;
  }
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const results = await checkInvariants(db);
    console.log(`Invariants de l'argent (03 §5.7) — ${hostOf(url)}`);
    for (const result of results) {
      console.log(`${result.ok ? "✓" : "✗"} ${result.name}`);
      for (const detail of result.details) console.log(`    ${detail}`);
    }
    let ok = results.every((result) => result.ok);

    if (withChiffres) {
      allowServerModules();
      const chiffres = await computeChiffres(db);
      console.log("");
      printChiffres(chiffres);
      if (rapportPath) {
        const reference = referenceFromRapport(JSON.parse(readFileSync(rapportPath, "utf8")));
        console.log("");
        console.log(`Comparaison au rapport de reprise (07 §2.5) — ${rapportPath}`);
        for (const comparison of compareWithRapport(chiffres, reference)) {
          console.log(`${comparison.ok ? "✓" : "✗"} ${comparison.line}`);
          ok &&= comparison.ok;
        }
      }
    }
    return ok ? 0 : 1;
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      console.error(error instanceof HostRefusedError ? error.message : error);
      process.exit(1);
    });
}

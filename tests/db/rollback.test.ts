/**
 * Retour arrière de la bascule, éprouvé (docs/refonte/07-PLAN-EXECUTION.md §1.7 ; critère
 * « Retour arrière éprouvé » de J16).
 *
 * Indépendant de tests/db/global-setup.ts : ce fichier crée sa propre base sur le serveur de
 * `TEST_DATABASE_URL` (local obligatoire), à l'ANCIEN schéma, y charge le jeu de
 * `fixtures/reprise/jeu.ts`, puis joue la chaîne complète du jour J avec les VRAIS scripts, dans des
 * processus séparés :
 *
 *   instantané (lecture seule) → reference → expand → reprise --apply → contract → ROLLBACK
 *
 * et vérifie qu'après le retour arrière la base est revenue **exactement** à l'ancien monde : la
 * référence recalculée est identique au bloc `mesures` d'avant la bascule (au centime), plus aucun
 * objet de la refonte ne subsiste, chaque ancienne table est là avec son compte exact, et
 * `_prisma_migrations` ne porte plus les deux migrations de la refonte.
 *
 * Dernier cas, joué en dernier parce qu'il laisse volontairement la base fausse : un instantané
 * ALTÉRÉ. Empreinte non recalculée, le retour arrière refuse avant d'écrire ; empreinte recalculée
 * (l'altération devient indétectable à la lecture), c'est le CONTRÔLE FINAL qui la rattrape.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertNotProduction } from "../../scripts/lib/garde-hote";
import { ouvrirBase, type Base } from "../../scripts/migration/lib/base";
import type { Controle } from "../../scripts/migration/lib/controles";
import type { Mesures } from "../../scripts/migration/lib/reference-format";
import { assertCibleLocale } from "../../scripts/repetition/lib/garde-cible";
import { extraireInstantane, type Manifeste } from "../../scripts/repetition/lib/instantane";
import { environnementPour, lancerScript, type Execution } from "../../scripts/repetition/lib/processus";
import { appliquerAncienSchema, recreerBase, supprimerBase } from "../../scripts/repetition/lib/restauration";
import { REFERENCE } from "./fixtures/reprise/attendu";
import { chargerJeu } from "./fixtures/reprise/jeu";

// Lu AVANT tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const LENT = 15 * 60_000;

/** Base propre à ce fichier, nommée d'après la base de test (`nurea_test_x` → `nurea_test_x_j16_rollback`). */
function urlDeTest(suffixe: string): string {
  const url = new URL(assertNotProduction(TEST_DATABASE_URL, "Tests de retour arrière"));
  const base = decodeURIComponent(url.pathname.replace(/^\//, ""));
  url.pathname = `/${base}_${suffixe}`;
  return assertCibleLocale(url.toString(), "Tests de retour arrière").url;
}

const URL_ROLLBACK = urlDeTest("j16_rollback");
/** Fausse URL de production : référence du projet, hôte local sans serveur (aucune connexion possible). */
const URL_PRODUCTION = "postgresql://postgres.lkdhqqzocmxtyarseizc:faux@127.0.0.1:1/postgres";

/** Anciennes tables qui doivent être de retour dans `public` (07 §1.7, critère de J16). */
const TABLES_ANCIENNES = [
  "AdminUser",
  "AppSetting",
  "AuditLog",
  "Batch",
  "BatchExpense",
  "Brand",
  "CashMovement",
  "Customer",
  "ExternalImportSuggestion",
  "Order",
  "OrderItem",
  "PaymentTransaction",
  "Perfume",
  "PerfumeMedia",
  "PerfumePricing",
  "Pocket",
  "Sale",
  "SaleItem",
] as const;

let dossier: string;
let db: Base;
let manifeste: Manifeste;

function script(nom: string, args: string[], url = URL_ROLLBACK): Execution {
  return lancerScript(nom, args, environnementPour(url));
}

function sortie(execution: Execution): string {
  return `${execution.sortie}\n${execution.erreurs}`;
}

async function compter(table: string, base: Base = db): Promise<number> {
  const [ligne] = await base.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${table}`);
  return ligne?.n ?? -1;
}

function lireJson<T>(fichier: string): T {
  return JSON.parse(fs.readFileSync(fichier, "utf8")) as T;
}

const instantane = () => path.join(dossier, "instantane");
const reference = () => path.join(dossier, "ref", "reference.json");
const sorties = () => path.join(dossier, "rollback");

interface RapportRollback {
  statut: string;
  controles: Controle[];
  vidage: { schemas: string[]; objets: { schema: string; genre: string; nom: string }[] };
  donnees: { tables: { nom: string; lignes: number }[] };
  durees: { phase: string; ms: number }[];
}

/** L'ancien monde : base recréée, migrations d'avant l'expand, jeu de la reprise. */
beforeAll(async () => {
  dossier = fs.mkdtempSync(path.join(os.tmpdir(), "nurea-j16-rollback-"));
  await recreerBase(URL_ROLLBACK);
  appliquerAncienSchema(URL_ROLLBACK);
  db = await ouvrirBase(URL_ROLLBACK);
  await chargerJeu(db);
}, LENT);

afterAll(async () => {
  await db?.$disconnect();
  await supprimerBase(URL_ROLLBACK);
  if (dossier) fs.rmSync(dossier, { recursive: true, force: true });
}, LENT);

describe("garde d'hôte", () => {
  it("URL de production sans --confirm-host : refus, sans tenter de connexion", () => {
    const execution = script("scripts/migration/rollback.ts", ["--instantane", instantane()], URL_PRODUCTION);
    expect(execution.code).not.toBe(0);
    expect(sortie(execution)).toMatch(/production/);
    expect(sortie(execution)).not.toMatch(/ECONNREFUSED|Can't reach|P1001/);
  }, LENT);

  it("--instantane manquant : refus", () => {
    const execution = script("scripts/migration/rollback.ts", []);
    expect(execution.code).not.toBe(0);
    expect(sortie(execution)).toMatch(/--instantane <dossier> est obligatoire/);
  }, LENT);
});

describe("aller : instantané → reference → expand → reprise → contract", () => {
  it("instantané de l'ancien monde extrait en lecture seule", async () => {
    const extraction = await extraireInstantane(URL_ROLLBACK, instantane());
    manifeste = extraction.manifeste;
    const lignes = Object.fromEntries(manifeste.tables.map((t) => [t.nom, t.lignes]));
    expect(lignes).toMatchObject({
      Order: REFERENCE.comptages.Order,
      Sale: REFERENCE.comptages.Sale,
      CashMovement: REFERENCE.comptages.CashMovement,
      _prisma_migrations: 24,
    });
    for (const nom of TABLES_ANCIENNES) expect(lignes, nom).toHaveProperty(nom);
  }, LENT);

  it("référence d'avant la bascule figée", () => {
    const execution = script("scripts/migration/reference.ts", ["--out", path.join(dossier, "ref")]);
    expect(execution.code, sortie(execution)).toBe(0);
    const { mesures } = lireJson<{ mesures: Mesures }>(reference());
    expect(mesures.tresorerie.totalNonArchivees).toBe(REFERENCE.totalNonArchivees);
    expect(mesures.encaisse.ancien).toBe(REFERENCE.encaisseAncien);
  }, LENT);

  it("expand, reprise --apply et contract appliqués : la base est passée à la refonte", async () => {
    for (const [nom, args] of [
      ["scripts/migration/apply-sql-migration.ts", ["refonte_expand"]],
      ["scripts/migration/reprise.ts", ["--apply", "--reference", reference(), "--report", path.join(dossier, "reprise")]],
      ["scripts/migration/apply-sql-migration.ts", ["refonte_contract"]],
    ] as [string, string[]][]) {
      const execution = script(nom, args);
      expect(execution.code, `${nom}\n${sortie(execution)}`).toBe(0);
    }
    expect(await compter(`"SaleDocument"`)).toBeGreaterThan(0);
    expect(await compter(`"Payment"`)).toBeGreaterThan(0);
    expect(await compter(`legacy."Order"`)).toBe(REFERENCE.comptages.Order);
    expect(await compter(`legacy."MigrationReference"`)).toBe(1);
    // La référence d'avant la bascule est DANS la base : le retour arrière n'a pas besoin du fichier.
    expect(await compter(`"_prisma_migrations" WHERE migration_name LIKE '%refonte%'`)).toBe(2);
  }, LENT);
});

describe("retour : npm run migration:rollback -- --instantane <dossier>", () => {
  let rapport: RapportRollback;

  it("sortie 0, phases chronométrées, rapport écrit", async () => {
    // La connexion du test est fermée le temps du retour arrière : il vide `public`, dont les tables
    // que ce client a préparées, et PostgreSQL ne peut pas supprimer une table encore verrouillée.
    await db.$disconnect();
    const execution = script("scripts/migration/rollback.ts", ["--instantane", instantane(), "--out", sorties()]);
    db = await ouvrirBase(URL_ROLLBACK);
    expect(execution.code, sortie(execution)).toBe(0);

    rapport = lireJson<RapportRollback>(path.join(sorties(), "rollback.json"));
    expect(rapport.statut).toBe("vert");
    expect(rapport.controles.filter((c) => !c.ok)).toEqual([]);
    expect(rapport.controles.map((c) => c.code)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    expect(rapport.durees.map((d) => d.phase.split(" ")[0])).toEqual(["vidage", "schéma", "données", "contrôle"]);
    expect(fs.existsSync(path.join(sorties(), "rollback.md"))).toBe(true);
    // La référence attendue est recopiée à part : une relance après échec la retrouve.
    expect(fs.existsSync(path.join(sorties(), "reference-attendue.json"))).toBe(true);
  }, LENT);

  it("le vidage a emporté les objets de la refonte ET vidé legacy, sans supprimer les schémas", async () => {
    const supprimes = rapport.vidage.objets.map((o) => `${o.schema}.${o.nom}`);
    expect(rapport.vidage.schemas).toEqual(["legacy", "public"]);
    expect(supprimes).toContain("public.SaleDocument");
    expect(supprimes).toContain("public.DocumentBalance");
    expect(supprimes).toContain("legacy.Order");
    expect(rapport.vidage.objets.some((o) => o.genre === "routine" && o.nom.startsWith("nurea_period_start"))).toBe(true);

    const [schemas] = await db.$queryRawUnsafe<{ n: number }[]>(
      `SELECT count(*)::int AS n FROM pg_namespace WHERE nspname IN ('public', 'legacy')`,
    );
    expect(schemas?.n).toBe(2);
  }, LENT);

  it("plus aucun objet de la refonte : tables, vue, fonctions de période, triggers, legacy vide", async () => {
    const [objets] = await db.$queryRawUnsafe<Record<string, boolean>[]>(
      `SELECT to_regclass('public."SaleDocument"')    IS NULL AS "saleDocument",
              to_regclass('public."SaleLine"')        IS NULL AS "saleLine",
              to_regclass('public."Payment"')         IS NULL AS payment,
              to_regclass('public."Setting"')         IS NULL AS setting,
              to_regclass('public."DocumentBalance"') IS NULL AS "documentBalance"`,
    );
    expect(objets).toEqual({ saleDocument: true, saleLine: true, payment: true, setting: true, documentBalance: true });

    const routines = await db.$queryRawUnsafe<{ nom: string }[]>(
      `SELECT p.proname AS nom FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname IN ('public', 'legacy') AND p.proname LIKE 'nurea\\_%'`,
    );
    expect(routines).toEqual([]);

    const triggers = await db.$queryRawUnsafe<{ nom: string }[]>(
      `SELECT t.tgname AS nom FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'legacy')`,
    );
    expect(triggers).toEqual([]);

    const enums = await db.$queryRawUnsafe<{ nom: string }[]>(
      `SELECT t.typname AS nom FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE t.typtype = 'e' AND n.nspname IN ('public', 'legacy')
         AND t.typname IN ('DocumentOrigin', 'DocumentStatus', 'PaymentKind', 'CashMovementKindV2')`,
    );
    expect(enums).toEqual([]);

    const objetsLegacy = await db.$queryRawUnsafe<{ nom: string }[]>(
      `SELECT c.relname AS nom FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'legacy' AND c.relkind IN ('v', 'm', 'r', 'p', 'S')`,
    );
    expect(objetsLegacy).toEqual([]);

    // Les anciens enums, eux, sont de retour : c'est le monde d'avant.
    const anciens = await db.$queryRawUnsafe<{ nom: string }[]>(
      `SELECT t.typname AS nom FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE t.typtype = 'e' AND n.nspname = 'public' AND t.typname IN ('OrderStatus', 'PaymentType', 'CashMovementKind')
       ORDER BY t.typname`,
    );
    expect(anciens.map((t) => t.nom)).toEqual(["CashMovementKind", "OrderStatus", "PaymentType"]);
  }, LENT);

  it("chaque ancienne table est de retour dans public, à son compte exact", async () => {
    const attendus = Object.fromEntries(manifeste.tables.map((t) => [t.nom, t.lignes]));
    const obtenus: Record<string, number> = {};
    for (const nom of TABLES_ANCIENNES) obtenus[nom] = await compter(`public."${nom}"`);
    expect(obtenus).toEqual(Object.fromEntries(TABLES_ANCIENNES.map((nom) => [nom, attendus[nom]])));
    expect(obtenus.Order).toBe(REFERENCE.comptages.Order);
    expect(obtenus.CashMovement).toBe(REFERENCE.comptages.CashMovement);
    expect(obtenus.PerfumeMedia).toBe(REFERENCE.comptages.PerfumeMedia);
  }, LENT);

  it("_prisma_migrations est celle de l'instantané, sans les deux migrations de la refonte", async () => {
    expect(await compter(`"_prisma_migrations" WHERE migration_name LIKE '%refonte_expand'`)).toBe(0);
    expect(await compter(`"_prisma_migrations" WHERE migration_name LIKE '%refonte_contract'`)).toBe(0);
    const table = manifeste.tables.find((t) => t.nom === "_prisma_migrations");
    expect(await compter(`"_prisma_migrations"`)).toBe(table?.lignes);
  }, LENT);

  it("la référence recalculée est identique au bloc « mesures » d'avant la bascule, au centime", () => {
    const avant = lireJson<{ mesures: Mesures }>(reference()).mesures;
    const apres = lireJson<{ mesures: Mesures }>(path.join(sorties(), "controle", "reference.json")).mesures;
    expect(apres).toEqual(avant);
    const r5 = rapport.controles.find((c) => c.code === "R5");
    expect(r5?.ok).toBe(true);
    expect(r5?.valeurs.ecarts).toBe(0);
    expect(r5?.valeurs.encaisseRecalcule).toBe(REFERENCE.encaisseAncien);
  }, LENT);

  it("les séquences rendent une valeur au-dessus du plus grand identifiant restauré", async () => {
    const [sequence] = await db.$queryRawUnsafe<{ id: number }[]>(
      `SELECT nextval(pg_get_serial_sequence('"Perfume"', 'id'))::int AS id`,
    );
    expect(sequence?.id).toBe(4);
  }, LENT);
});

describe("instantané altéré : le retour arrière ne laisse pas passer un centime", () => {
  const altere = () => path.join(dossier, "instantane-altere");

  /** Copie de l'instantané dont UNE ligne de `CashMovement` perd un centime. */
  function copierEnAlterant(recalculerEmpreinte: boolean): void {
    fs.rmSync(altere(), { recursive: true, force: true });
    fs.cpSync(instantane(), altere(), { recursive: true });
    const manifesteAltere = lireJson<Manifeste>(path.join(altere(), "manifest.json"));
    const table = manifesteAltere.tables.find((t) => t.nom === "CashMovement");
    if (!table) throw new Error("CashMovement absente du manifeste");
    const chemin = path.join(altere(), table.fichier);
    const lignes = fs.readFileSync(chemin, "utf8").split("\n");
    const index = lignes.findIndex((l) => l.includes(`"id":"mv-paire-livree-vente"`));
    if (index < 0) throw new Error("mouvement mv-paire-livree-vente absent de l'instantané");
    const ligneAlteree = (lignes[index] as string).replace(/"amount":-?\d+(\.\d+)?/, `"amount":49.99`);
    if (ligneAlteree === lignes[index]) throw new Error(`montant illisible dans ${lignes[index]}`);
    lignes[index] = ligneAlteree;
    fs.writeFileSync(chemin, lignes.join("\n"), "utf8");
    if (recalculerEmpreinte) {
      table.sha256 = crypto.createHash("sha256").update(fs.readFileSync(chemin)).digest("hex");
      fs.writeFileSync(path.join(altere(), "manifest.json"), `${JSON.stringify(manifesteAltere, null, 2)}\n`, "utf8");
    }
  }

  it("empreinte non recalculée : refus avant toute écriture", async () => {
    copierEnAlterant(false);
    const avant = await compter(`"CashMovement"`);
    const execution = script("scripts/migration/rollback.ts", [
      "--instantane",
      altere(),
      "--reference",
      reference(),
      "--out",
      path.join(dossier, "rollback-refus"),
    ]);
    expect(execution.code).not.toBe(0);
    expect(sortie(execution)).toMatch(/Instantané altéré/);
    expect(await compter(`"CashMovement"`)).toBe(avant);
  }, LENT);

  it("empreinte recalculée : le contrôle final rattrape le centime et la commande sort en erreur", async () => {
    copierEnAlterant(true);
    const dossierSortie = path.join(dossier, "rollback-ecart");
    await db.$disconnect();
    const execution = script("scripts/migration/rollback.ts", [
      "--instantane",
      altere(),
      "--reference",
      reference(),
      "--out",
      dossierSortie,
    ]);
    db = await ouvrirBase(URL_ROLLBACK);
    expect(execution.code).not.toBe(0);
    expect(sortie(execution)).toMatch(/NE PAS ROUVRIR/);

    const rapport = lireJson<RapportRollback>(path.join(dossierSortie, "rollback.json"));
    expect(rapport.statut).toBe("rouge");
    // Structure intacte (R1–R4 verts) : seul le contrôle chiffré tombe.
    expect(rapport.controles.filter((c) => !c.ok).map((c) => c.code)).toEqual(["R5"]);
    const r5 = rapport.controles.find((c) => c.code === "R5");
    const chemins = (r5?.ecarts ?? []).map((e) => String(e.chemin));
    expect(chemins).toContain("mesures.tresorerie.totalNonArchivees");
    expect(chemins.some((c) => /^mesures\.poches\[\d+\]\.solde$/.test(c))).toBe(true);
  }, LENT);
});

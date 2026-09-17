/**
 * Reprise des données (jalon J2) — docs/refonte/07-PLAN-EXECUTION.md J2, §2.2–2.5 ; 03-MODELE-DONNEES.md §7.
 *
 * Indépendant de tests/db/global-setup.ts : ce fichier crée ses propres bases sur le serveur de
 * `TEST_DATABASE_URL` (local obligatoire), à l'ANCIEN schéma — dossiers de migration appliqués un par un
 * jusqu'à celui qui précède `…_refonte_expand` (aujourd'hui `20260910160000_fix_delivered_at_backfill` :
 * visuels story et contenances 10/50/80 de la production compris) —, y charge le jeu de
 * `fixtures/reprise/jeu.ts`, puis joue
 * la vraie chaîne, scripts lancés comme en production (processus séparés) :
 *   instantané en lecture seule → restauration → reference → expand → reprise (--dry-run, écart injecté,
 *   --apply, seconde reprise) → contract → verify.
 * Les valeurs attendues sont écrites en dur dans `fixtures/reprise/attendu.ts`, calculées à la main.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HostRefusedError, assertNotProduction } from "../../scripts/lib/garde-hote";
import { centimes } from "../../scripts/migration/lib/argent";
import { ouvrirBase, type Base } from "../../scripts/migration/lib/base";
import { assertCibleLocale } from "../../scripts/repetition/lib/garde-cible";
import { SQL_DEBUT, SQL_FIN, SQL_TABLES, extraireInstantane, sqlLignes } from "../../scripts/repetition/lib/instantane";
import { ErreurPostgres } from "../../scripts/repetition/lib/pg-lecture-seule";
import { environnementPour, lancerScript, type Execution } from "../../scripts/repetition/lib/processus";
import { appliquerAncienSchema, recreerBase, supprimerBase } from "../../scripts/repetition/lib/restauration";
import { APRES, CREATIONS, DOCUMENTS, MOUVEMENTS, R4, REFERENCE, V8 } from "./fixtures/reprise/attendu";
import { chargerJeu } from "./fixtures/reprise/jeu";

// Lu AVANT tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

const LENT = 10 * 60_000;

/**
 * Bases propres à ce fichier, nommées d'après la base de test (`nurea_test` → `nurea_test_j2_reprise`,
 * `nurea_test_x` → `nurea_test_x_j2_reprise`) : deux exécutions sur deux bases de test ne se détruisent
 * pas l'une l'autre.
 */
function urlDeTest(suffixe: string): string {
  const url = new URL(assertNotProduction(TEST_DATABASE_URL, "Tests de reprise"));
  const base = decodeURIComponent(url.pathname.replace(/^\//, ""));
  url.pathname = `/${base}_${suffixe}`;
  return assertCibleLocale(url.toString(), "Tests de reprise").url;
}

const URL_REPRISE = urlDeTest("j2_reprise");
const URL_RESTAUREE = urlDeTest("j2_restaure");
/** Fausse URL de production : référence du projet, hôte local sans serveur (aucune connexion possible). */
const URL_PRODUCTION = "postgresql://postgres.lkdhqqzocmxtyarseizc:faux@127.0.0.1:1/postgres";

let dossier: string;
let db: Base;

function script(nom: string, args: string[], url = URL_REPRISE): Execution {
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

interface ControleJson {
  code: string;
  ok: boolean;
  ecarts: Record<string, unknown>[];
  valeurs: Record<string, string | number>;
}

beforeAll(async () => {
  dossier = fs.mkdtempSync(path.join(os.tmpdir(), "nurea-j2-reprise-"));
  await recreerBase(URL_REPRISE);
  appliquerAncienSchema(URL_REPRISE);
  db = await ouvrirBase(URL_REPRISE);
  await chargerJeu(db);
}, LENT);

afterAll(async () => {
  await db?.$disconnect();
  await supprimerBase(URL_REPRISE);
  await supprimerBase(URL_RESTAUREE);
  if (dossier) fs.rmSync(dossier, { recursive: true, force: true });
}, LENT);

describe("gardes", () => {
  it("les garde-fous refusent toute cible de test non locale ou mal nommée", () => {
    expect(() => assertCibleLocale("postgresql://u:p@db.example.com:5432/nurea_repetition", "t")).toThrow(HostRefusedError);
    expect(() => assertCibleLocale("postgresql://u:p@localhost:5432/postgres", "t")).toThrow(HostRefusedError);
    expect(() => assertCibleLocale("postgresql://postgres.lkdhqqzocmxtyarseizc:x@localhost:5432/nurea_repetition", "t")).toThrow(/production/);
  });

  it("URL de production sans --confirm-host : chaque script refuse, sans tenter de connexion", () => {
    const reference = path.join(dossier, "reference-factice.json");
    fs.writeFileSync(reference, "{}");
    const appels: [string, string[]][] = [
      ["scripts/migration/reference.ts", []],
      ["scripts/migration/apply-sql-migration.ts", ["refonte_expand"]],
      ["scripts/migration/reprise.ts", ["--apply", "--reference", reference]],
      ["scripts/migration/verify-post.ts", ["--reference", reference]],
      ["scripts/repetition/refresh.ts", ["--sans-migration"]],
    ];
    for (const [nom, args] of appels) {
      const execution = script(nom, args, URL_PRODUCTION);
      expect(execution.code, nom).not.toBe(0);
      expect(sortie(execution), nom).toMatch(/production/);
      expect(sortie(execution), nom).not.toMatch(/ECONNREFUSED|Can't reach|P1001/);
    }
  }, LENT);
});

describe("instantané de la source et restauration (variante locale de la répétition)", () => {
  const instantane = () => path.join(dossier, "instantane");

  it("extrait chaque table dans UNE transaction READ ONLY ; une écriture y est refusée ; rien d'autre n'est envoyé", async () => {
    let refus: unknown = null;
    const { manifeste, journal } = await extraireInstantane(URL_REPRISE, instantane(), {
      avantFin: async (connexion) => {
        refus = await connexion.requete(`UPDATE "Pocket" SET name = 'piratée'`).catch((e: unknown) => e);
      },
    });

    expect(refus).toBeInstanceOf(ErreurPostgres);
    expect((refus as ErreurPostgres).code).toBe("25006"); // read_only_sql_transaction
    expect(await compter(`"Pocket" WHERE name = 'piratée'`)).toBe(0);

    const tables = manifeste.tables.map((t) => t.nom);
    expect(tables).toContain("_prisma_migrations");
    expect(journal).toEqual([SQL_DEBUT, SQL_TABLES, ...tables.map(sqlLignes), `UPDATE "Pocket" SET name = 'piratée'`, SQL_FIN]);

    const lignes = Object.fromEntries(manifeste.tables.map((t) => [t.nom, t.lignes]));
    expect(lignes).toMatchObject({
      Order: REFERENCE.comptages.Order,
      Sale: REFERENCE.comptages.Sale,
      CashMovement: REFERENCE.comptages.CashMovement,
      PaymentTransaction: REFERENCE.comptages.PaymentTransaction,
      PerfumeMedia: REFERENCE.comptages.PerfumeMedia,
      // Dossiers de l'ancien schéma : 21 jusqu'à retire_gestion_v2, plus les trois de la production du 10/09/2026.
      _prisma_migrations: 24,
    });
  }, LENT);

  it("repetition:refresh --from-snapshot --sans-migration restaure les données à l'identique", async () => {
    const execution = script(
      "scripts/repetition/refresh.ts",
      ["--from-snapshot", instantane(), "--sans-migration", "--out", path.join(dossier, "restauration")],
      URL_RESTAUREE,
    );
    expect(execution.code, sortie(execution)).toBe(0);
    expect(execution.sortie).toMatch(/durées/);

    const restauree = await ouvrirBase(URL_RESTAUREE);
    try {
      const tables = await db.$queryRawUnsafe<{ nom: string }[]>(`SELECT tablename AS nom FROM pg_tables WHERE schemaname = 'public'`);
      const empreinte = (nom: string) =>
        `SELECT md5(COALESCE(string_agg(j, E'\\n' ORDER BY j), '')) AS e FROM (SELECT row_to_json(t)::text AS j FROM "${nom}" t) s`;
      for (const { nom } of tables) {
        const [a] = await db.$queryRawUnsafe<{ e: string }[]>(empreinte(nom));
        const [b] = await restauree.$queryRawUnsafe<{ e: string }[]>(empreinte(nom));
        expect(b?.e, nom).toBe(a?.e);
      }
      const [sequence] = await restauree.$queryRawUnsafe<{ id: number }[]>(`SELECT nextval(pg_get_serial_sequence('"Perfume"', 'id'))::int AS id`);
      expect(sequence?.id).toBe(4);
    } finally {
      await restauree.$disconnect();
    }
  }, LENT);
});

describe("chaîne de reprise : reference → expand → reprise → contract → verify", () => {
  const ref = () => path.join(dossier, "ref", "reference.json");

  it("reference : anciennes formules sur l'ancien schéma", () => {
    const execution = script("scripts/migration/reference.ts", ["--out", path.join(dossier, "ref")]);
    expect(execution.code, sortie(execution)).toBe(0);
    const { mesures } = lireJson<{
      mesures: {
        poches: { id: string; solde: string }[];
        tresorerie: { totalNonArchivees: string; nonAttribue: string };
        encaisse: { ancien: string; d0: string; d1: string; d2: string };
        aEncaisser: { ancien: string };
        informatif: { aEncaisserListeAncienne: string; margeNetteAncienne: string };
        vitrine: Record<string, number>;
        comptages: Record<string, number>;
        visuels: { nombre: number; empreinte: string };
      };
    }>(ref());
    expect(mesures.visuels.nombre).toBe(REFERENCE.visuels.nombre);
    expect(mesures.visuels.empreinte).toMatch(/^[0-9a-f]{32}$/);
    expect(Object.fromEntries(mesures.poches.map((p) => [p.id, p.solde]))).toEqual(REFERENCE.poches);
    expect(mesures.tresorerie).toEqual({ totalNonArchivees: REFERENCE.totalNonArchivees, nonAttribue: REFERENCE.nonAttribue });
    expect(mesures.encaisse).toEqual({ ancien: REFERENCE.encaisseAncien, d0: REFERENCE.d0, d1: REFERENCE.d1, d2: REFERENCE.d2 });
    expect(mesures.aEncaisser.ancien).toBe(REFERENCE.aEncaisser);
    expect(mesures.informatif.aEncaisserListeAncienne).toBe(REFERENCE.aEncaisserListeAncienne);
    expect(mesures.informatif.margeNetteAncienne).toBe(REFERENCE.margeNetteAncienne);
    expect(mesures.vitrine).toEqual(REFERENCE.vitrine);
    expect(mesures.comptages).toMatchObject(REFERENCE.comptages);
  }, LENT);

  it("expand appliqué", () => {
    const execution = script("scripts/migration/apply-sql-migration.ts", ["refonte_expand"]);
    expect(execution.code, sortie(execution)).toBe(0);
  }, LENT);

  it("--dry-run (défaut) : rapport produit, contrôles verts, base inchangée", async () => {
    const rapport = path.join(dossier, "dry-run");
    const execution = script("scripts/migration/reprise.ts", ["--reference", ref(), "--report", rapport]);
    expect(execution.code, sortie(execution)).toBe(0);
    const json = lireJson<{ statut: string; controles: ControleJson[] }>(path.join(rapport, "rapport.json"));
    expect(json.statut).toBe("dry-run");
    expect(json.controles.filter((c) => !c.ok)).toEqual([]);
    expect(fs.existsSync(path.join(rapport, "rapport.md"))).toBe(true);
    expect(await compter(`"SaleDocument"`)).toBe(0);
    expect(await compter(`legacy."MigrationMap"`)).toBe(0);
    expect(await compter(`legacy."MigrationReference"`)).toBe(0);
    expect(await compter(`"CashMovement" WHERE "kindV2" IS NOT NULL`)).toBe(0);
    expect(await compter(`"Perfume" WHERE stock = -2`)).toBe(1);
  }, LENT);

  it("écart injecté de 0,01 € dans la référence d'une poche : sortie non nulle, ROLLBACK intégral", async () => {
    const reference = lireJson<{ mesures: { poches: { id: string; solde: string }[] } }>(ref());
    const especes = reference.mesures.poches.find((p) => p.id === "poche-especes");
    if (!especes) throw new Error("poche-especes absente de la référence");
    especes.solde = "894.51";
    const fichier = path.join(dossier, "reference-ecart.json");
    fs.writeFileSync(fichier, JSON.stringify(reference, null, 2));

    const rapport = path.join(dossier, "ecart");
    const execution = script("scripts/migration/reprise.ts", ["--apply", "--reference", fichier, "--report", rapport]);
    expect(execution.code).not.toBe(0);
    const json = lireJson<{ statut: string; controles: ControleJson[] }>(path.join(rapport, "rapport.json"));
    expect(json.statut).toBe("échec");
    const v1 = json.controles.find((c) => c.code === "V1");
    expect(v1?.ok).toBe(false);
    expect(v1?.ecarts).toEqual([{ poche: "poche-especes", nom: "Espèces", reference: "894.51", recalcule: "894.50", ecart: "-0.01" }]);
    expect(await compter(`"SaleDocument"`)).toBe(0);
    expect(await compter(`"Payment"`)).toBe(0);
    expect(await compter(`"Pocket" WHERE id = 'poche-na-2'`)).toBe(1);
  }, LENT);

  it("--apply : V1–V7 et C1–C5 verts, valeurs attendues, chaque cas dans la bonne liste", async () => {
    const rapport = path.join(dossier, "apply");
    const execution = script("scripts/migration/reprise.ts", ["--apply", "--reference", ref(), "--report", rapport]);
    expect(execution.code, sortie(execution)).toBe(0);

    type RapportJson = {
      statut: string;
      controles: ControleJson[];
      chiffres: {
        encaisse: { d0: string; d1: string; d2: string; nouveau: string; residu: string; perimetreAncienApres: string };
        aEncaisser: { avant: string; apres: string };
        margeNette: { nouvelle: string };
        tresorerie: { apres: string; nonAttribueApres: string };
      };
      comptages: Record<string, number>;
      mouvements: { id: string; categorie: string; motif: string }[];
      r3: { compensations: { poche: string; montant: string; decomposition: { montant: string }[] }[]; creations: { mouvement: string }[] };
      r4: Record<string, Record<string, unknown>[]>;
    };
    const json = lireJson<RapportJson>(path.join(rapport, "rapport.json"));
    expect(json.statut).toBe("appliquée");
    expect(json.controles.map((c) => c.code)).toEqual(["C1", "C2", "C3", "C4", "C5", "V1", "V2", "V3", "V4", "V5", "V6", "V7"]);
    expect(json.controles.filter((c) => !c.ok)).toEqual([]);

    // Chiffres (07 §2.5).
    expect(json.chiffres.encaisse).toMatchObject({
      d0: REFERENCE.d0,
      d1: REFERENCE.d1,
      d2: REFERENCE.d2,
      nouveau: APRES.encaisseNouveau,
      residu: "0.00",
      perimetreAncienApres: APRES.encaissePerimetreAncien,
    });
    expect(json.chiffres.aEncaisser).toEqual({ avant: REFERENCE.aEncaisser, apres: APRES.aEncaisser, listeAncienne: REFERENCE.aEncaisserListeAncienne });
    expect(json.chiffres.tresorerie).toMatchObject({ apres: REFERENCE.totalNonArchivees, nonAttribueApres: REFERENCE.nonAttribue });
    expect(json.chiffres.margeNette.nouvelle).toBe(APRES.margeNette);

    // En base, forme « dans la transaction » (kindV2) : soldes par poche, Encaissé, À encaisser.
    const soldes = await db.$queryRawUnsafe<{ id: string; solde: string }[]>(
      `SELECT p.id, (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2)::text AS solde
       FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id GROUP BY p.id`,
    );
    expect(Object.fromEntries(soldes.map((s) => [s.id, s.solde]))).toEqual(APRES.poches);
    const [chiffres] = await db.$queryRawUnsafe<{ encaisse: string; a_encaisser: string }[]>(
      `SELECT (SELECT SUM(m.amount) FROM "CashMovement" m JOIN "Payment" p ON p."movementId" = m.id
                WHERE m."kindV2" = 'PAYMENT')::numeric(12,2)::text AS encaisse,
              (SELECT SUM(due) FROM "DocumentBalance" WHERE status IN ('CONFIRMED', 'DELIVERED'))::numeric(12,2)::text AS a_encaisser`,
    );
    expect(chiffres).toEqual({ encaisse: APRES.encaisseNouveau, a_encaisser: APRES.aEncaisser });

    // Documents : statut, horodatages reconstitués (dont les deux paires non livrées), liens, payé, dû.
    const documents = await db.$queryRawUnsafe<Record<string, string | null>[]>(
      `SELECT d.id, d.origin::text AS origine, d.status::text AS statut,
              to_char(d."confirmedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS confirme,
              to_char(d."deliveredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS livre,
              to_char(d."cancelledAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS annule,
              d."customerId" AS client, d."batchId" AS lot, b.paid::text AS paye, b.due::text AS du
       FROM "SaleDocument" d JOIN "DocumentBalance" b ON b."documentId" = d.id`,
    );
    expect(
      Object.fromEntries(
        documents.map((d) => [d.id, [d.origine, d.statut, d.confirme, d.livre, d.annule, d.client, d.lot, d.paye, d.du]]),
      ),
    ).toEqual(DOCUMENTS);

    // Mouvements : chaque ancien mouvement dans exactement une catégorie (V5) ; créations attendues.
    expect(Object.fromEntries(json.mouvements.map((m) => [m.id, [m.categorie, m.motif]]))).toEqual(MOUVEMENTS);
    expect(json.comptages).toMatchObject({
      ...APRES.comptages,
      categorie_paiement: APRES.categories.paiement,
      categorie_depense: APRES.categories.depense,
      categorie_manuel: APRES.categories.manuel,
      categorie_ecart: APRES.categories.ecart,
    });
    const creees = await db.$queryRawUnsafe<{ id: string; poche: string; montant: string; date: string; reverses: string | null }[]>(
      `SELECT id, "pocketId" AS poche, amount::text AS montant,
              to_char("occurredAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS date, "reversesId" AS reverses
       FROM "CashMovement" WHERE id LIKE 'mig-%'`,
    );
    expect(
      Object.fromEntries(
        creees.map((c) => [c.id, [c.poche, c.montant, c.id.startsWith("mig-compensation-") ? null : c.date, c.reverses]]),
      ),
    ).toEqual(CREATIONS);
    expect(json.r3.compensations).toHaveLength(1);
    expect(json.r3.compensations[0]).toMatchObject(APRES.compensation);
    const decomposition = json.r3.compensations[0]?.decomposition.reduce((acc, d) => acc + centimes(d.montant), 0n);
    expect(decomposition).toBe(-8200n);

    // Listes d'arbitrage R4.
    const cle = (e: Record<string, unknown>) => String(e.ligne ?? e.document ?? e.poche ?? e.parfum ?? e.cle ?? e.id);
    expect(Object.fromEntries(Object.keys(R4).map((nom) => [nom, (json.r4[nom] ?? []).map(cle).sort()]))).toEqual(R4);
    expect(json.r4.contraintesQuiResterontNonValides).toEqual([
      { contrainte: "line_gift_ck", lignes: V8.line_gift_ck },
      { contrainte: "line_volume_ck", lignes: V8.line_volume_ck },
    ]);

    // Traces de reprise, poche système unique, stocks, réglage.
    expect(await compter(`legacy."MigrationReference"`)).toBe(1);
    expect(await compter(`legacy."MigrationMap" WHERE "oldTable" = 'Sale' AND "newId" = 'cmd-paire-livree' AND note = 'paire'`)).toBe(1);
    expect(await compter(`"Pocket" WHERE "isSystem"`)).toBe(1);
    expect(await compter(`"Perfume" WHERE stock IS NULL`)).toBe(2);
    expect(await compter(`"Perfume" WHERE id = 1 AND stock = 5`)).toBe(1);
    expect(await compter(`"Setting" WHERE id = 1 AND "defaultExchangeRate" = 275.5 AND "defaultPocketId" IS NULL`)).toBe(1);
    expect(await compter(`"SaleLine" WHERE id = 'vl-paire-livree-1' AND "unitCostEur" = 30 AND "unitCostDzd" = 8310 AND "exchangeRate" = 277`)).toBe(1);
    expect(await compter(`"SaleLine" WHERE id = 'ol-sans-nom-1' AND "perfumeName" = 'Hors catalogue' AND "isOffCatalog"`)).toBe(1);
    expect(await compter(`"SaleLine" WHERE id = 'ol-partielle-1' AND "deliveredQuantity" = 1`)).toBe(1);
    expect(await compter(`"SaleLine" WHERE id = 'vl-don-prix' AND note = 'Offert pour l''anniversaire'`)).toBe(1);
    expect(await compter(`"Payment" WHERE id = 'pt-rembourse-refund' AND kind = 'REFUND' AND "movementId" = 'mv-rembourse-refund'`)).toBe(1);
    expect(await compter(`"CashMovement" WHERE id = 'mv-transfert-seul' AND "transferGroupId" IS NULL AND label LIKE 'Écart historique — transfert incomplet%'`)).toBe(1);
    expect(await compter(`"CashMovement" WHERE id = 'mv-paire-livree-vente' AND amount = 50`)).toBe(1);
    expect(await compter(`"BatchExpense" WHERE "movementId" IS NULL`)).toBe(0);
  }, LENT);

  it("reprise lancée une seconde fois : refus de démarrer, rien n'est écrit", async () => {
    const avant = await compter(`"CashMovement"`);
    const execution = script("scripts/migration/reprise.ts", ["--apply", "--reference", ref(), "--report", path.join(dossier, "seconde")]);
    expect(execution.code).not.toBe(0);
    expect(execution.erreurs).toMatch(/"SaleDocument" n'est pas vide/);
    expect(await compter(`"SaleDocument"`)).toBe(APRES.comptages.documents);
    expect(await compter(`"CashMovement"`)).toBe(avant);
  }, LENT);

  it("contract : sortie 0 malgré les volumes 75 ml, 30 ml hérité et nul, et le don à prix non nul", () => {
    const execution = script("scripts/migration/apply-sql-migration.ts", ["refonte_contract"]);
    expect(execution.code, sortie(execution)).toBe(0);
  }, LENT);

  it("verify : V8 liste line_volume_ck et line_gift_ck avec leurs lignes ; C1–C5, V9, V11 verts", async () => {
    const rapport = path.join(dossier, "verify");
    const execution = script("scripts/migration/verify-post.ts", ["--reference", ref(), "--report", rapport]);
    expect(execution.code, sortie(execution)).toBe(0);
    const json = lireJson<{ statut: string; controles: ControleJson[]; v8: { contrainte: string; admise: boolean; lignes: { id: string }[] }[] }>(
      path.join(rapport, "verification.json"),
    );
    expect(json.statut).toBe("verte");
    expect(json.controles.filter((c) => !c.ok)).toEqual([]);
    expect(json.controles.map((c) => c.code)).toEqual(
      expect.arrayContaining(["C1", "C2", "C3", "C4", "C5", "V1", "V2", "V3", "V4", "V6", "V7", "V8", "V9", "V11"]),
    );

    // Visuels story : restés dans public, même ligne, date convertie en timestamptz sans décalage.
    expect(await compter(`legacy."PerfumeMedia"`).catch(() => "absente")).toBe("absente");
    const visuels = await db.$queryRawUnsafe<{ id: string; type: string; cree: string }[]>(
      `SELECT id, pg_typeof("createdAt")::text AS type,
              to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS cree
       FROM "PerfumeMedia"`,
    );
    expect(visuels).toEqual([{ id: "media-sauvage-1", type: "timestamp with time zone", cree: REFERENCE.visuels.createdAt }]);
    expect(json.v8.map((c) => [c.contrainte, c.admise, c.lignes.map((l) => l.id)])).toEqual([
      ["line_gift_ck", true, V8.line_gift_ck],
      ["line_volume_ck", true, V8.line_volume_ck],
    ]);

    const soldes = await db.$queryRawUnsafe<{ id: string; solde: string }[]>(
      `SELECT p.id, (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2)::text AS solde
       FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id GROUP BY p.id`,
    );
    expect(Object.fromEntries(soldes.map((s) => [s.id, s.solde]))).toEqual(APRES.poches);
    const [{ encaisse }] = (await db.$queryRawUnsafe<{ encaisse: string }[]>(
      `SELECT SUM(m.amount)::numeric(12,2)::text AS encaisse FROM "CashMovement" m
       JOIN "Payment" p ON p."movementId" = m.id WHERE m.kind = 'PAYMENT'`,
    )) as [{ encaisse: string }];
    expect(encaisse).toBe(APRES.encaisseNouveau);
    expect(await compter(`legacy."Order"`)).toBe(REFERENCE.comptages.Order);
  }, LENT);

  it("une ligne reprise au volume nul refuse toute mise à jour (line_volume_ck)", async () => {
    await expect(
      db.$executeRawUnsafe(`UPDATE "SaleLine" SET "deliveredQuantity" = 0 WHERE id = 'vl-volume-nul'`),
    ).rejects.toThrow(/line_volume_ck/);
  }, LENT);

  it("une ligne reprise à une contenance héritée (30 ml) refuse toute mise à jour, jusqu'au choix d'une contenance réelle", async () => {
    await expect(
      db.$executeRawUnsafe(`UPDATE "SaleLine" SET "deliveredQuantity" = 1 WHERE id = 'ol-sans-paiement-1'`),
    ).rejects.toThrow(/line_volume_ck/);
    await expect(
      db.$executeRawUnsafe(`UPDATE "SaleLine" SET "volumeMl" = 10 WHERE id = 'ol-sans-paiement-1'`),
    ).resolves.toBe(1);
  }, LENT);
});

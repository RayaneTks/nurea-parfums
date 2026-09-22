/**
 * Reprise des données de l'ancien modèle vers le nouveau (docs/refonte/03-MODELE-DONNEES.md §7.3 étape 3 ;
 * 07-PLAN-EXECUTION.md §2.2).
 *
 *   npm run migration:reprise -- --reference <reference.json> [--apply | --dry-run] [--report <dossier>]
 *                                [--confirm-host <hôte>]
 *
 * S'exécute ENTRE l'expand et le contract, en UNE transaction interactive :
 *   3a poche système · 3b réglages · 3c documents et lignes · 3d paiements et mouvements · 3e dépenses ·
 *   3f mouvements manuels et écarts · 3g compensation · 3h stock · 3i assertions V1–V7 et C1–C5.
 * `--dry-run` par défaut : tout est calculé, contrôlé et rapporté, puis ANNULÉ (ROLLBACK).
 * `--apply` : validé (COMMIT) si et seulement si tous les contrôles sont verts.
 *
 * Refuse de démarrer si l'expand n'est pas appliqué, si la base est déjà contractée, ou si
 * `SaleDocument` n'est pas vide (rejouabilité sans doublon). Insère la référence dans
 * `legacy."MigrationReference"`, remplit `legacy."MigrationMap"`. Écrit `rapport.json` et `rapport.md`
 * (dossier relatif rangé sous migration-artifacts/<date>/), y compris en cas d'échec. Code non nul au
 * moindre écart. Base : `DIRECT_URL`, sinon `DATABASE_URL` ; production seulement avec `--confirm-host`.
 */
import path from "node:path";
import { ecrireFichier, json, resoudreEntree, resoudreSortie } from "./lib/artefacts";
import { FORMAT_DATE, HostRefusedError, lignes, lireCible, ouvrirBase, premiere, type Sql } from "./lib/base";
import { ErreurUsage, lireArguments } from "./lib/cli";
import { lireReference } from "./lib/reference-format";
import { hostOf } from "../lib/garde-hote";
import { nouveauContexte, type Contexte } from "./reprise/contexte";
import { etape3aPocheSysteme } from "./reprise/3a-poche-systeme";
import { etape3bReglages } from "./reprise/3b-reglages";
import { etape3cDocuments } from "./reprise/3c-documents";
import { chargerHistoriques, etape3dPaiements } from "./reprise/3d-paiements";
import { etape3eDepenses } from "./reprise/3e-depenses";
import { etape3fMouvementsManuels } from "./reprise/3f-mouvements-manuels";
import { etape3gCompensation } from "./reprise/3g-compensation";
import { etape3hStock } from "./reprise/3h-stock";
import { etape3iAssertions, type ResultatAssertions } from "./reprise/3i-assertions";
import { construireRapport, rapportMarkdown, type Rapport, type Statut } from "./reprise/rapport";

const USAGE = "migration:reprise";

/** Levée en fin de transaction pour l'annuler : exécution à blanc, ou contrôle rouge. */
class Annulation extends Error {
  constructor(readonly statut: Statut) {
    super(statut);
  }
}

async function noms(db: Sql): Promise<Rapport["noms"]> {
  const poches = await lignes<{ id: string; name: string }>(db, `SELECT id, name FROM "Pocket"`);
  const documents = await lignes<{ id: string; client: string | null }>(
    db,
    `SELECT d.id, COALESCE(c."fullName", d."customerName") AS client
     FROM "SaleDocument" d LEFT JOIN "Customer" c ON c.id = d."customerId"`,
  );
  const origines = await lignes<{ id: string; client: string | null }>(
    db,
    `SELECT 'Sale:' || m."oldId" AS id, COALESCE(c."fullName", d."customerName") AS client
     FROM legacy."MigrationMap" m JOIN "SaleDocument" d ON d.id = m."newId" LEFT JOIN "Customer" c ON c.id = d."customerId"
     WHERE m."oldTable" = 'Sale' AND m."newTable" = 'SaleDocument'
     UNION ALL
     SELECT 'PaymentTransaction:' || p.id, COALESCE(c."fullName", d."customerName")
     FROM "Payment" p JOIN "SaleDocument" d ON d.id = p."documentId" LEFT JOIN "Customer" c ON c.id = d."customerId"
     WHERE p.id NOT LIKE 'mig-%'`,
  );
  const tri = <T extends { id: string }>(l: T[]) => [...l].sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    poches: Object.fromEntries(tri(poches).map((p) => [p.id, p.name])),
    documents: Object.fromEntries(tri(documents).map((d) => [d.id, d.client])),
    origines: Object.fromEntries(tri(origines).map((o) => [o.id, o.client])),
  };
}

async function main(): Promise<number> {
  const args = lireArguments(process.argv.slice(2), {
    drapeaux: ["--apply", "--dry-run"],
    valeurs: ["--reference", "--report", "--confirm-host"],
  });
  if (args.drapeaux.has("--apply") && args.drapeaux.has("--dry-run")) {
    throw new ErreurUsage("--apply et --dry-run sont exclusifs.");
  }
  const appliquer = args.drapeaux.has("--apply");
  const url = lireCible(USAGE, args.valeurs.get("--confirm-host"));
  const fichierReference = args.valeurs.get("--reference");
  if (!fichierReference) throw new ErreurUsage("--reference <reference.json> est obligatoire.");
  const { reference, texte } = lireReference(resoudreEntree(fichierReference));
  const dossier = resoudreSortie(args.valeurs.get("--report"));

  const db = await ouvrirBase(url);
  try {
    const etat = await premiere<{ expand: boolean; ancien: boolean }>(
      db,
      `SELECT to_regclass('public."SaleDocument"') IS NOT NULL AS expand, to_regclass('public."Order"') IS NOT NULL AS ancien`,
    );
    if (!etat.expand) {
      console.error(`${USAGE} — refus : "SaleDocument" n'existe pas, l'expand n'est pas appliqué.`);
      return 1;
    }
    if (!etat.ancien) {
      console.error(`${USAGE} — refus : "Order" n'est plus dans public, la base est déjà contractée.`);
      return 1;
    }
    const { vide } = await premiere<{ vide: boolean }>(db, `SELECT NOT EXISTS (SELECT 1 FROM "SaleDocument") AS vide`);
    if (!vide) {
      console.error(`${USAGE} — refus : "SaleDocument" n'est pas vide, la reprise a déjà eu lieu.`);
      return 1;
    }

    console.log(`${USAGE} — ${appliquer ? "APPLICATION" : "exécution à blanc (--dry-run)"} sur ${hostOf(url)}`);
    let ctx: Contexte | null = null;
    let resultat: ResultatAssertions | null = null;
    let nomsRapport: Rapport["noms"] = { poches: {}, documents: {}, origines: {} };
    let statut: Statut;
    let erreur: string | null = null;

    try {
      await db.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL TimeZone = 'UTC'`);
          await tx.$executeRawUnsafe(
            `LOCK TABLE "SaleDocument", "SaleLine", "Payment", "Setting", "Order", "OrderItem", "Sale", "SaleItem",
                        "PaymentTransaction", "CashMovement", "BatchExpense", "Pocket", "AppSetting", "Perfume"
             IN SHARE ROW EXCLUSIVE MODE`,
          );
          const verrou = await premiere<{ vide: boolean; instant: string }>(
            tx,
            `SELECT NOT EXISTS (SELECT 1 FROM "SaleDocument") AS vide,
                    to_char(transaction_timestamp() AT TIME ZONE 'UTC', ${FORMAT_DATE}) AS instant`,
          );
          if (!verrou.vide) throw new Error(`"SaleDocument" n'est pas vide, la reprise a déjà eu lieu.`);
          await tx.$executeRawUnsafe(
            `INSERT INTO legacy."MigrationReference" ("computedAt", host, reference) VALUES ($1::timestamptz, $2, $3::jsonb)`,
            reference.horodatages.calculeLe,
            reference.horodatages.hote,
            texte,
          );

          const contexte = nouveauContexte(tx, reference, verrou.instant);
          ctx = contexte;
          await etape3aPocheSysteme(contexte);
          await etape3bReglages(contexte);
          await etape3cDocuments(contexte);
          await chargerHistoriques(contexte);
          await etape3dPaiements(contexte);
          await etape3eDepenses(contexte);
          await etape3fMouvementsManuels(contexte);
          await etape3gCompensation(contexte);
          await etape3hStock(contexte);
          resultat = await etape3iAssertions(contexte);
          nomsRapport = await noms(tx);

          if (contexte.controles.some((c) => c.bloquant && !c.ok)) throw new Annulation("échec");
          if (!appliquer) throw new Annulation("dry-run");
        },
        { maxWait: 10_000, timeout: 30 * 60_000 },
      );
      statut = "appliquée";
    } catch (error) {
      if (error instanceof Annulation) {
        statut = error.statut;
      } else {
        statut = "échec";
        erreur = error instanceof Error ? error.message : String(error);
      }
    }

    const rapport = construireRapport({ statut, reference, ctx, resultat, erreur, noms: nomsRapport });
    ecrireFichier(path.join(dossier, "rapport.json"), json(rapport));
    ecrireFichier(path.join(dossier, "rapport.md"), rapportMarkdown(rapport));
    afficherResume(rapport, dossier);
    return statut === "appliquée" || statut === "dry-run" ? 0 : 1;
  } finally {
    await db.$disconnect();
  }
}

function afficherResume(rapport: Rapport, dossier: string): void {
  const c = rapport.chiffres;
  console.log(`${USAGE} — statut : ${rapport.statut}`);
  if (rapport.erreur) console.error(`${USAGE} — erreur : ${rapport.erreur}`);
  for (const controle of rapport.controles) {
    const ligne = `  ${controle.ok ? "vert " : "ROUGE"} ${controle.code} ${controle.libelle}`;
    if (controle.ok) console.log(ligne);
    else console.error(`${ligne}\n${JSON.stringify(controle.ecarts, null, 2)}`);
  }
  console.log(
    `  Trésorerie ${c.tresorerie.avant} → ${c.tresorerie.apres ?? "—"} · Encaissé ${c.encaisse.ancien} → ${c.encaisse.nouveau ?? "—"} ` +
      `(attendu ${c.encaisse.attendu}, résidu ${c.encaisse.residu ?? "—"}) · À encaisser ${c.aEncaisser.avant} → ${c.aEncaisser.apres ?? "—"}`,
  );
  console.log(`  Rapport : ${path.join(dossier, "rapport.md")}`);
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof HostRefusedError || error instanceof ErreurUsage) {
      console.error(`${USAGE} — ${error.message}`);
    } else {
      console.error(`${USAGE} — échec :`, error);
    }
    process.exit(1);
  },
);

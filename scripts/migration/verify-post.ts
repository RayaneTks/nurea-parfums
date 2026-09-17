/**
 * Vérifications après le contract (docs/refonte/03-MODELE-DONNEES.md §7.8 ; 07-PLAN-EXECUTION.md §2.2, §2.5).
 *
 *   npm run migration:verify -- --reference <reference.json> [--report <dossier>] [--confirm-host <hôte>]
 *
 * Sur le schéma FINAL, en lecture seule (transaction REPEATABLE READ READ ONLY) :
 * - V8 : contraintes restées `NOT VALID`, avec leurs lignes fautives. Seules sont admises celles que la
 *   reprise liste en R4 comme lignes à compléter par un geste (03 §4.3) : `line_volume_ck`,
 *   `line_gift_ck`, `line_cost_ck`. Toute autre contrainte non validée est un échec ;
 * - C1–C5 recalculés contre la référence (forme finale : `kind`, dates `timestamptz`), avec V1–V4 ;
 * - invariants de 03 §5.7 (V6 : pièces, signes, contre-passations, transferts, poches archivées ; V7) ;
 * - V9 en base : parfums publiés, cartes gamme, marques Explorer = référence ;
 * - V11 : visuels story `PerfumeMedia` toujours dans public, nombre et empreinte = référence (la table
 *   est conservée en place ; seule sa date est passée en timestamptz par le contract) ;
 * - C6 informatif.
 * Écrit `verification.json` et `verification.md` (dossier relatif rangé sous migration-artifacts/<date>/).
 * Code non nul au moindre écart.
 */
import path from "node:path";
import { ecrireFichier, json, resoudreEntree, resoudreSortie } from "./lib/artefacts";
import { HostRefusedError, lignes, lireCible, ouvrirBase, premiere, type Sql } from "./lib/base";
import { ErreurUsage, lireArguments } from "./lib/cli";
import {
  FORME_FINALE,
  controlerCoherenceLedger,
  controlerDusCommandes,
  controlerDusVentes,
  controlerEncaisse,
  controlerHorodatages,
  controlerLedger,
  controlerTotaux,
  controlerTresorerie,
  mesurerInformatif,
  type ChiffresInformatifs,
  type Controle,
} from "./lib/controles";
import { lireReference, type Reference } from "./lib/reference-format";
import { mesurerVisuels } from "./lib/visuels";
import { comptagesVitrine } from "./lib/vitrine";
import { hostOf } from "../lib/garde-hote";

const USAGE = "migration:verify";

/** Contraintes qu'une ligne reprise peut violer : le geste qui touche la ligne demande de la compléter. */
const NON_VALIDES_ADMISES = new Set(["line_volume_ck", "line_gift_ck", "line_cost_ck"]);

interface ContrainteNonValide {
  table: string;
  contrainte: string;
  admise: boolean;
  lignes: { id: string; ligne: string }[];
}

async function contraintesNonValides(db: Sql): Promise<ContrainteNonValide[]> {
  const contraintes = await lignes<{ table: string; contrainte: string; definition: string }>(
    db,
    `SELECT c.conrelid::regclass::text AS "table", c.conname AS contrainte, pg_get_constraintdef(c.oid) AS definition
     FROM pg_constraint c
     WHERE c.contype = 'c' AND NOT c.convalidated AND c.connamespace = 'public'::regnamespace
     ORDER BY c.conname`,
  );
  const resultat: ContrainteNonValide[] = [];
  for (const c of contraintes) {
    const expression = c.definition.replace(/^CHECK\s*/, "").replace(/\s*NOT VALID\s*$/, "");
    const fautives = await lignes<{ id: string; ligne: string }>(
      db,
      `SELECT v.id, v.ligne FROM (
         SELECT COALESCE(to_jsonb(t)->>'id', concat_ws(':', to_jsonb(t)->>'perfumeId', to_jsonb(t)->>'volumeMl')) AS id,
                (to_jsonb(t) - 'createdAt' - 'updatedAt')::text AS ligne
         FROM ${c.table} t WHERE NOT COALESCE((${expression}), true)
       ) v ORDER BY v.id COLLATE "C"`,
    );
    resultat.push({ table: c.table, contrainte: c.contrainte, admise: NON_VALIDES_ADMISES.has(c.contrainte), lignes: fautives });
  }
  return resultat;
}

interface Verification {
  format: "nurea-verification/1";
  statut: "verte" | "rouge";
  horodatages: { verifieeLe: string; hote: string; referenceCalculeeLe: string };
  controles: Controle[];
  v8: ContrainteNonValide[];
  informatif: ChiffresInformatifs;
}

async function verifier(db: Sql, reference: Reference, hote: string): Promise<Verification> {
  const { verifieeLe } = await premiere<{ verifieeLe: string }>(
    db,
    `SELECT to_char(transaction_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "verifieeLe"`,
  );
  const controles: Controle[] = [];
  controles.push(...(await controlerTresorerie(db, reference)));
  controles.push(await controlerDusVentes(db, reference));
  controles.push(await controlerDusCommandes(db, reference));
  controles.push(await controlerTotaux(db, reference));
  controles.push(await controlerLedger(db, FORME_FINALE));
  controles.push(await controlerHorodatages(db));
  controles.push(...(await controlerEncaisse(db, reference, FORME_FINALE)).controles);
  controles.push(await controlerCoherenceLedger(db, FORME_FINALE));

  const v8 = await contraintesNonValides(db);
  const refusees = v8.filter((c) => !c.admise).map((c) => ({ table: c.table, contrainte: c.contrainte, lignes: c.lignes.map((l) => l.id) }));
  controles.push({
    code: "V8",
    libelle: "Contraintes validées, ou restées NOT VALID seulement pour des lignes reprises à compléter (R4)",
    bloquant: true,
    ok: refusees.length === 0,
    valeurs: Object.fromEntries(v8.map((c) => [c.contrainte, c.lignes.length])),
    ecarts: refusees,
  });

  const vitrine = await comptagesVitrine(db);
  const attendu = reference.mesures.vitrine;
  const ecartsVitrine = (Object.keys(attendu) as (keyof typeof attendu)[])
    .filter((cle) => vitrine[cle] !== attendu[cle])
    .map((cle) => ({ comptage: cle, reference: attendu[cle], base: vitrine[cle] }));
  controles.push({
    code: "V9",
    libelle: "Vitrine (en base) : parfums publiés, cartes gamme, marques Explorer = référence",
    bloquant: true,
    ok: ecartsVitrine.length === 0,
    valeurs: { ...vitrine },
    ecarts: ecartsVitrine,
  });

  const { enPlace } = await premiere<{ enPlace: boolean }>(
    db,
    `SELECT to_regclass('public."PerfumeMedia"') IS NOT NULL AND to_regclass('legacy."PerfumeMedia"') IS NULL AS "enPlace"`,
  );
  const visuels = enPlace ? await mesurerVisuels(db) : null;
  const visuelsAttendus = reference.mesures.visuels;
  const ecartsVisuels: Record<string, unknown>[] = [];
  if (!visuels) {
    ecartsVisuels.push({ regle: `"PerfumeMedia" absente de public, ou déplacée dans legacy` });
  } else {
    if (visuels.nombre !== visuelsAttendus.nombre) {
      ecartsVisuels.push({ regle: "nombre de visuels", reference: visuelsAttendus.nombre, base: visuels.nombre });
    }
    if (visuels.empreinte !== visuelsAttendus.empreinte) {
      ecartsVisuels.push({ regle: "empreinte des visuels (une ligne a changé)", reference: visuelsAttendus.empreinte, base: visuels.empreinte });
    }
  }
  controles.push({
    code: "V11",
    libelle: "Visuels story (PerfumeMedia) conservés dans public : nombre et empreinte = référence",
    bloquant: true,
    ok: ecartsVisuels.length === 0,
    valeurs: { nombre: visuels?.nombre ?? "absente", empreinte: visuels?.empreinte ?? "absente" },
    ecarts: ecartsVisuels,
  });

  controles.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
  return {
    format: "nurea-verification/1",
    statut: controles.every((c) => c.ok || !c.bloquant) ? "verte" : "rouge",
    horodatages: { verifieeLe, hote, referenceCalculeeLe: reference.horodatages.calculeLe },
    controles,
    v8,
    informatif: await mesurerInformatif(db, reference, FORME_FINALE),
  };
}

function markdown(v: Verification): string {
  const out = [`# Vérification après contract — ${v.statut === "verte" ? "verte" : "ROUGE"}\n`];
  out.push(`Vérifiée le ${v.horodatages.verifieeLe} sur ${v.horodatages.hote} (référence du ${v.horodatages.referenceCalculeeLe}).\n`);
  out.push(`| code | contrôle | résultat |\n| --- | --- | --- |`);
  for (const c of v.controles) out.push(`| ${c.code} | ${c.libelle} | ${c.ok ? "vert" : "ROUGE"} |`);
  out.push(`\n## V8 — contraintes restées NOT VALID\n`);
  if (v.v8.length === 0) out.push(`_Toutes les contraintes sont validées._\n`);
  for (const c of v.v8) {
    out.push(`### ${c.contrainte} (${c.table}) — ${c.admise ? "admise : lignes reprises listées en R4" : "NON ADMISE"}\n`);
    for (const l of c.lignes) out.push(`- \`${l.id}\` : ${l.ligne}`);
    out.push("");
  }
  for (const c of v.controles.filter((x) => !x.ok)) {
    out.push(`## ${c.code} — écarts\n\n\`\`\`json\n${JSON.stringify(c.ecarts, null, 2)}\n\`\`\`\n`);
  }
  out.push(`## Informatif\n\n\`\`\`json\n${JSON.stringify(v.informatif, null, 2)}\n\`\`\``);
  return `${out.join("\n")}\n`;
}

async function main(): Promise<number> {
  const args = lireArguments(process.argv.slice(2), { valeurs: ["--reference", "--report", "--confirm-host"] });
  const url = lireCible(USAGE, args.valeurs.get("--confirm-host"));
  const fichierReference = args.valeurs.get("--reference");
  if (!fichierReference) throw new ErreurUsage("--reference <reference.json> est obligatoire.");
  const { reference } = lireReference(resoudreEntree(fichierReference));
  const dossier = resoudreSortie(args.valeurs.get("--report"));

  const db = await ouvrirBase(url);
  try {
    const etat = await premiere<{ contracte: boolean }>(
      db,
      `SELECT to_regclass('public."Order"') IS NULL AND to_regclass('legacy."Order"') IS NOT NULL AS contracte`,
    );
    if (!etat.contracte) {
      console.error(`${USAGE} — refus : la base n'est pas contractée ("Order" doit être dans legacy).`);
      return 1;
    }
    const verification = await db.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);
        return verifier(tx, reference, hostOf(url));
      },
      { maxWait: 10_000, timeout: 10 * 60_000 },
    );
    ecrireFichier(path.join(dossier, "verification.json"), json(verification));
    ecrireFichier(path.join(dossier, "verification.md"), markdown(verification));
    for (const c of verification.controles) {
      const ligne = `  ${c.ok ? "vert " : "ROUGE"} ${c.code} ${c.libelle}`;
      if (c.ok) console.log(ligne);
      else console.error(`${ligne}\n${JSON.stringify(c.ecarts, null, 2)}`);
    }
    for (const c of verification.v8) {
      console.log(`  V8 ${c.contrainte} NOT VALID (${c.admise ? "admise" : "NON ADMISE"}) : ${c.lignes.map((l) => l.id).join(", ")}`);
    }
    console.log(`${USAGE} — ${verification.statut} · ${path.join(dossier, "verification.md")}`);
    return verification.statut === "verte" ? 0 : 1;
  } finally {
    await db.$disconnect();
  }
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

/**
 * `npm run catalogue:fournisseur` — ajoute au catalogue les références de la liste du fournisseur
 * (reçue le 12/10/2026) qui n'y sont pas encore. Rien n'est modifié ni supprimé : seules des fiches
 * NOUVELLES sont insérées.
 *
 * Chaque fiche naît masquée (`DRAFT`), sans visuel : elle est visible dans la gestion, et la recherche de
 * la vitrine la reconnaît (`unlisted_match`, nom et marque seulement) puis invite à écrire. Une marque
 * absente est créée masquée elle aussi (pas de logo, donc pas de page de marque publique).
 *
 * L'écriture passe par les writers du catalogue (`createBrand`, `createPerfume`), jamais en SQL brut :
 * noms normalisés, doublons de graphie refusés, CHECK respectés. Une transaction par marque, car la
 * transaction unique est plafonnée à 15 s ; le script est rejouable (une fiche déjà là est sautée).
 *
 * Par défaut il LIT et montre ce qu'il ferait (« essai à blanc »). `--apply` écrit, et exige
 * `--attendu <n>` : le nombre de fiches que l'essai à blanc a annoncé. Si la base a bougé entre-temps et
 * que le compte diffère, rien n'est écrit. Un journal des lignes créées est tenu (`--journal`), et
 * `--annuler <journal>` retire EXACTEMENT ces lignes (jamais une fiche vendue ou ayant un visuel).
 *
 * Cible : `DATABASE_URL`, lue AVANT l'import de Prisma — qui chargerait sinon `.env`, c'est-à-dire la
 * production. Sans variable : refus. Production : `--confirm-host <hôte>` exigé, même pour l'essai à blanc.
 *
 * Après l'écriture, le cache public de la vitrine doit être monté (`unlisted-perfumes-vN` dans
 * `src/lib/catalogue-service.ts`) : les données d'abord, le déploiement ensuite.
 *
 *   npm run catalogue:fournisseur -- --confirm-host <hôte>                       (essai à blanc)
 *   npm run catalogue:fournisseur -- --confirm-host <hôte> --apply --attendu 233
 *   npm run catalogue:fournisseur -- --confirm-host <hôte> --annuler <journal.json> [--apply]
 *
 * `--liste <fichier>` choisit un autre lot (relatif à ce dossier), avec son propre `--journal`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertHostConfirmed, HostRefusedError } from "../lib/garde-hote";
import { cleNom, normaliseMarque, normaliseParfum } from "../../src/lib/nommage";

// Lu AVANT tout import de @prisma/client, qui charge `.env` (la production) dans process.env.
const DATABASE_URL = process.env.DATABASE_URL;

const USAGE =
  "Usage : npm run catalogue:fournisseur -- --confirm-host <hôte> [--apply --attendu <n>] [--journal <fichier>] [--liste <fichier>] | --annuler <journal.json> [--apply]";

const DEFAULT_JOURNAL = "migration-artifacts/references-fournisseur-journal.json";
const DEFAULT_LISTE = "fournisseur-2026-10/references.json";

export type Reference = { brand: string; name: string; line?: string; fournisseur?: readonly string[] };

export type MarqueEnBase = { id: string; name: string };
export type ParfumEnBase = { brandId: string; name: string };

export type Options = {
  apply: boolean;
  attendu?: number;
  confirmHost?: string;
  journal: string;
  annuler?: string;
  /** Fichier de références, relatif au dossier du script (défaut : le lot du 12/10/2026). */
  liste: string;
};

export function parseArgs(argv: readonly string[]): Options {
  const options: Options = { apply: false, journal: DEFAULT_JOURNAL, liste: DEFAULT_LISTE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--attendu" && next !== undefined) {
      options.attendu = Number(next);
      i += 1;
    } else if (arg === "--confirm-host" && next !== undefined) {
      options.confirmHost = next;
      i += 1;
    } else if (arg === "--journal" && next !== undefined) {
      options.journal = next;
      i += 1;
    } else if (arg === "--annuler" && next !== undefined) {
      options.annuler = next;
      i += 1;
    } else if (arg === "--liste" && next !== undefined) {
      options.liste = next;
      i += 1;
    }
  }
  return options;
}

// ── Plan (pur : aucune base) ───────────────────────────────────────────────────

export type Insertion = {
  /** Marque telle qu'on la saisit ; l'équivalente déjà en base est reprise par `createBrand`. */
  brand: string;
  /** Id de la marque déjà en base, sinon `null` : elle sera créée. */
  brandId: string | null;
  name: string;
  /** Gamme de la marque (ex. « Emporio Armani » chez Giorgio Armani), sinon absente. */
  line?: string;
};

export type Plan = {
  /** Références du fichier. */
  total: number;
  /** Déjà au catalogue (même marque, même nom à la casse, aux accents et à la ponctuation près). */
  dejaPresentes: Reference[];
  aInserer: Insertion[];
  /** Noms des marques à créer. */
  marquesACreer: string[];
  /** Doublons possibles à relire à la main : ressemblance avec une fiche ou une marque existante. */
  proches: string[];
};

/** Deux clés se ressemblent si l'une contient l'autre (4 caractères au moins). */
function seRessemblent(a: string, b: string): boolean {
  if (a === b || Math.min(a.length, b.length) < 4) return false;
  return a.includes(b) || b.includes(a);
}

export function planifier(
  references: readonly Reference[],
  marques: readonly MarqueEnBase[],
  parfums: readonly ParfumEnBase[],
): Plan {
  const marqueParCle = new Map(marques.map((marque) => [cleNom(marque.name), marque]));
  const nomsParMarque = new Map<string, string[]>();
  for (const parfum of parfums) {
    const noms = nomsParMarque.get(parfum.brandId) ?? [];
    noms.push(parfum.name);
    nomsParMarque.set(parfum.brandId, noms);
  }

  const dejaPresentes: Reference[] = [];
  const aInserer: Insertion[] = [];
  const proches: string[] = [];
  const vues = new Set<string>();
  const marquesACreer = new Map<string, string>();

  for (const reference of references) {
    const marqueCle = cleNom(reference.brand);
    const nomPropre = normaliseParfum(reference.name);
    const nomCle = cleNom(nomPropre);
    const unique = `${marqueCle}|${nomCle}`;
    if (vues.has(unique)) continue; // doublon dans le fichier lui-même
    vues.add(unique);

    const marque = marqueParCle.get(marqueCle);
    const noms = marque ? (nomsParMarque.get(marque.id) ?? []) : [];
    if (noms.some((nom) => cleNom(nom) === nomCle)) {
      dejaPresentes.push(reference);
      continue;
    }

    if (!marque && !marquesACreer.has(marqueCle)) {
      marquesACreer.set(marqueCle, normaliseMarque(reference.brand));
      for (const existante of marques) {
        if (seRessemblent(marqueCle, cleNom(existante.name))) {
          proches.push(`marque « ${reference.brand} » ressemble à la marque existante « ${existante.name} »`);
        }
      }
    }
    for (const nom of noms) {
      if (seRessemblent(nomCle, cleNom(nom))) {
        proches.push(`${reference.brand} : « ${nomPropre} » ressemble à la fiche existante « ${nom} »`);
      }
    }
    aInserer.push({ brand: reference.brand, brandId: marque?.id ?? null, name: nomPropre, ...(reference.line ? { line: reference.line } : {}) });
  }

  return { total: references.length, dejaPresentes, aInserer, marquesACreer: [...marquesACreer.values()], proches };
}

export function decrire(plan: Plan): string {
  const lignes = [
    `Références dans la liste : ${plan.total}`,
    `Déjà au catalogue : ${plan.dejaPresentes.length}`,
    `Fiches à ajouter : ${plan.aInserer.length}`,
    `Marques à créer : ${plan.marquesACreer.length}${plan.marquesACreer.length > 0 ? ` (${plan.marquesACreer.join(", ")})` : ""}`,
  ];
  if (plan.proches.length > 0) {
    lignes.push("", `À relire (ressemblances, aucune n'est bloquante) : ${plan.proches.length}`, ...plan.proches.map((p) => `  - ${p}`));
  }
  return lignes.join("\n");
}

// ── Journal ────────────────────────────────────────────────────────────────────

export type Journal = {
  date: string;
  hote: string;
  marques: { id: string; name: string }[];
  parfums: { id: number; brand: string; name: string }[];
};

function ecrireJournal(chemin: string, journal: Journal): void {
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
}

// ── Écriture ───────────────────────────────────────────────────────────────────

/** Le client de base nécessaire en lecture, rendu par `src/lib/db/prisma`. */
type Lecteur = {
  brand: { findMany(args: { select: { id: true; name: true } }): Promise<MarqueEnBase[]> };
  perfume: { findMany(args: { select: { brandId: true; name: true } }): Promise<ParfumEnBase[]> };
};

export async function lireCatalogue(db: Lecteur): Promise<{ marques: MarqueEnBase[]; parfums: ParfumEnBase[] }> {
  const [marques, parfums] = await Promise.all([
    db.brand.findMany({ select: { id: true, name: true } }),
    db.perfume.findMany({ select: { brandId: true, name: true } }),
  ]);
  return { marques, parfums };
}

/**
 * Écrit le plan, une transaction par marque. Rendu : le journal des lignes créées (écrit au fil de l'eau,
 * pour qu'une coupure en cours de route laisse de quoi annuler).
 */
export async function appliquer(plan: Plan, hote: string, cheminJournal: string | null): Promise<Journal> {
  const [{ inTransaction }, catalogueWriter, { createPerfumeInput }] = await Promise.all([
    import("@/server/db/transaction"),
    import("@/server/catalogue/writer"),
    import("@/contracts/catalogue"),
  ]);

  const journal: Journal = { date: new Date().toISOString(), hote, marques: [], parfums: [] };
  const parMarque = new Map<string, Insertion[]>();
  for (const insertion of plan.aInserer) {
    const cle = cleNom(insertion.brand);
    parMarque.set(cle, [...(parMarque.get(cle) ?? []), insertion]);
  }

  for (const insertions of parMarque.values()) {
    const [premiere] = insertions;
    if (!premiere) continue;
    const lot = await inTransaction(async (tx) => {
      let brandId = premiere.brandId;
      let marqueCreee: { id: string; name: string } | null = null;
      if (brandId === null) {
        const creation = await catalogueWriter.createBrand(tx, {
          name: premiere.brand,
          catalogMode: "CURATED",
          status: "DRAFT",
          image: null,
          imageLight: null,
        });
        brandId = creation.brand.id;
        if (creation.created) marqueCreee = { id: creation.brand.id, name: creation.brand.name };
      }
      const creees: { id: number; brand: string; name: string }[] = [];
      for (const insertion of insertions) {
        const ecriture = await catalogueWriter.createPerfume(
          tx,
          createPerfumeInput.parse({
            brand: { kind: "existing", brandId },
            name: insertion.name,
            status: "DRAFT",
            ...(insertion.line ? { line: insertion.line } : {}),
          }),
        );
        creees.push({ id: ecriture.perfume.id, brand: insertion.brand, name: ecriture.perfume.name });
      }
      return { marqueCreee, creees };
    });
    if (lot.marqueCreee) journal.marques.push(lot.marqueCreee);
    journal.parfums.push(...lot.creees);
    if (cheminJournal) ecrireJournal(cheminJournal, journal);
  }
  return journal;
}

export type BilanAnnulation = { supprimes: number; gardes: string[] };

/**
 * Retire les lignes du journal, et elles seules. Une fiche qui a changé depuis (visuel, publication, nom)
 * ou qui sert à une vente est GARDÉE et signalée ; une marque qui garde des parfums aussi.
 */
export async function annuler(journal: Journal, apply: boolean): Promise<BilanAnnulation> {
  const [{ inTransaction }, catalogueWriter] = await Promise.all([
    import("@/server/db/transaction"),
    import("@/server/catalogue/writer"),
  ]);
  const gardes: string[] = [];
  let supprimes = 0;

  for (const parfum of [...journal.parfums].reverse()) {
    await inTransaction(async (tx) => {
      const ligne = await tx.db.perfume.findUnique({
        where: { id: parfum.id },
        select: { name: true, image: true, imageLight: true, status: true, isFeatured: true },
      });
      if (!ligne) return; // déjà retirée
      const ventes = await tx.db.saleLine.count({ where: { perfumeId: parfum.id } });
      const intacte =
        ligne.name === parfum.name && ligne.image === "" && ligne.imageLight === null && ligne.status === "DRAFT" && !ligne.isFeatured;
      if (!intacte || ventes > 0) {
        gardes.push(`${parfum.brand} — ${parfum.name} (#${parfum.id}) : ${ventes > 0 ? "liée à une vente" : "modifiée depuis l'ajout"}`);
        return;
      }
      supprimes += 1;
      if (apply) await catalogueWriter.deletePerfume(tx, parfum.id);
    });
  }

  for (const marque of [...journal.marques].reverse()) {
    await inTransaction(async (tx) => {
      const restants = await tx.db.perfume.count({ where: { brandId: marque.id } });
      // En essai à blanc, les fiches du journal ne sont pas encore retirées : on ne compte que celles gardées.
      const bloquants = apply ? restants : gardes.filter((ligne) => ligne.startsWith(`${marque.name} —`)).length;
      if (bloquants > 0) {
        gardes.push(`marque ${marque.name} : conservée, il lui reste des parfums`);
        return;
      }
      if (apply) await catalogueWriter.deleteBrand(tx, marque.id);
    });
  }
  return { supprimes, gardes };
}

// ── Programme ──────────────────────────────────────────────────────────────────

function chargerReferences(liste: string): Reference[] {
  const chemin = new URL(`./${liste}`, import.meta.url);
  return JSON.parse(readFileSync(chemin, "utf8")) as Reference[];
}

async function main(): Promise<number> {
  const options = parseArgs(process.argv.slice(2));
  const url = assertHostConfirmed(DATABASE_URL, options.confirmHost, "Références du fournisseur");
  process.env.DATABASE_URL = url;
  const hote = new URL(url).hostname;

  try {
    await import("server-only");
  } catch {
    console.error(`Relance avec --conditions=react-server (modules serveur).\n${USAGE}`);
    return 1;
  }

  const { prisma } = await import("@/lib/db/prisma");
  try {
    if (options.annuler) {
      if (!existsSync(options.annuler)) {
        console.error(`Journal introuvable : ${options.annuler}`);
        return 1;
      }
      const journal = JSON.parse(readFileSync(options.annuler, "utf8")) as Journal;
      const bilan = await annuler(journal, options.apply);
      console.log(
        `${options.apply ? "Retirées" : "À retirer (essai à blanc)"} : ${bilan.supprimes} fiche(s) sur ${journal.parfums.length}.`,
      );
      for (const ligne of bilan.gardes) console.log(`  gardée : ${ligne}`);
      if (!options.apply) console.log("Rien n'a été modifié. Ajoute --apply pour retirer.");
      return 0;
    }

    const { marques, parfums } = await lireCatalogue(prisma);
    const plan = planifier(chargerReferences(options.liste), marques, parfums);
    console.log(`Base : ${hote}`);
    console.log(decrire(plan));

    if (!options.apply) {
      console.log("\nEssai à blanc : rien n'a été écrit. Pour écrire : --apply --attendu " + plan.aInserer.length);
      return 0;
    }
    if (options.attendu !== plan.aInserer.length) {
      console.error(
        `\nRefus : --attendu ${options.attendu ?? "(absent)"} ne correspond pas aux ${plan.aInserer.length} fiches à ajouter. Relance l'essai à blanc et reprends son chiffre.`,
      );
      return 1;
    }
    const journal = await appliquer(plan, hote, options.journal);
    console.log(`\nÉcrit : ${journal.parfums.length} fiche(s), ${journal.marques.length} marque(s) créée(s). Journal : ${options.journal}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuté seulement comme script (les fonctions ci-dessus restent importables par un test).
if (process.argv[1] && /ajouter-references\.ts$/.test(process.argv[1])) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (cause: unknown) => {
      console.error(cause instanceof HostRefusedError ? cause.message : cause);
      process.exitCode = 1;
    },
  );
}

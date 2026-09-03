/**
 * Correction des références de stock mal orthographiées par le fournisseur.
 *
 *   Essai à blanc : npx dotenv -e .env.local -- npx tsx scripts/stock-corriger.ts
 *   Écriture      : … scripts/stock-corriger.ts --appliquer
 *
 * `scripts/stock-a-creer.ts` a créé 160 fiches à partir d'une liste manuscrite.
 * Douze portaient un nom dont on n'était pas sûr, et neuf entrées illisibles
 * avaient été écartées plutôt que devinées. Ce script applique le résultat de
 * la recherche menée sur ces vingt-et-une références.
 *
 * Deux opérations, et deux seulement :
 *
 *   RENOMMAGES — une fiche existe déjà, sous un nom faux. On corrige le nom,
 *                la marque si elle était fausse aussi, et le slug qui en
 *                découle. On ne crée rien, on ne supprime rien.
 *
 *   AJOUTS     — une entrée écartée a été identifiée. On crée la fiche, comme
 *                les 160 autres : masquée et sans visuel.
 *
 * Ce qui n'a pas été identifié n'est pas touché. Une fiche au nom douteux vaut
 * mieux qu'une fiche au nom inventé : le doute se voit, l'invention non.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { normaliseMarque, normaliseParfum } from "../src/lib/nommage";
import { brandSlug, perfumeSlug } from "../src/lib/slugify";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

/**
 * Une fiche existante à renommer.
 *
 * `id` plutôt que le nom : c'est la seule référence qui ne bouge pas quand on
 * renomme, et elle rend le script rejouable sans risque de retomber sur une
 * autre fiche au nom voisin.
 */
type Renommage = {
  id: number;
  avant: string;
  marque: string;
  nom: string;
  pourquoi: string;
};

type Ajout = {
  marque: string;
  nom: string;
  pourquoi: string;
};

const RENOMMAGES: Renommage[] = [
  {
    id: 131,
    avant: "Gris Montagne",
    marque: "Dior",
    nom: "Gris Dior",
    pourquoi: "la liste Dior de Rayane tranche : ce n'est pas un Chanel, la maison n'a aucun « Gris ». Nom officiel depuis 2017 ; un flacon antérieur porte « Gris Montaigne », même jus",
  },
];

const AJOUTS: Ajout[] = [
  // ── Dior ──────────────────────────────────────────────
  // Liste envoyée par Rayane, dix-huit lignes. Six étaient déjà au catalogue
  // (J'adore, J'adore Eau Lumière, Poison Girl, Sauvage, Addict, Dior Homme
  // Intense) et « Gris montagne » est un renommage, pas un ajout : voir
  // RENOMMAGES. Restent les onze ci-dessous.
  { marque: "Dior", nom: "Hypnotic Poison", pourquoi: "écrit « Hypnitic » ; Dior écrit Hypnotic Poison (1998)" },
  { marque: "Dior", nom: "Joy by Dior", pourquoi: "écrit « Joy » ; le nom commercial complet est Joy by Dior (2018)" },
  { marque: "Dior", nom: "La Colle Noire", pourquoi: "écrit « La colle noi » ; La Collection Privée, 2016, d'après le château de Christian Dior à Montauroux" },
  { marque: "Dior", nom: "Miss Dior Blooming Bouquet", pourquoi: "écrit « Miss dior blooming » ; nom complet depuis 2014, quand Dior a retiré « Chérie »" },
  { marque: "Dior", nom: "Miss Dior Chérie", pourquoi: "écrit « Miss dior cherry » ; c'est Chérie, accentué (2005)" },
  { marque: "Dior", nom: "New Look", pourquoi: "nom actuel de la Collection Privée. Attention : un « New Look 1947 » de 2010 existe aussi, autre jus" },
  { marque: "Dior", nom: "Sauvage Elixir", pourquoi: "écrit « Sauvage élixir » ; Dior l'écrit sans accent (2021)" },
  { marque: "Dior", nom: "Dior Homme Cologne", pourquoi: "écrit « Homme cologne » ; la gamme porte « Dior Homme » en entier, comme « Dior Homme Intense » déjà en base" },
  { marque: "Dior", nom: "Dior Homme Parfum", pourquoi: "écrit « Homme le parfum » ; le nom officiel est Dior Homme Parfum, sans article" },
  { marque: "Dior", nom: "Dior Homme Sport", pourquoi: "écrit « Homme sport » ; nom complet de la gamme" },
  { marque: "Dior", nom: "Fahrenheit 32", pourquoi: "écrit « Farhenheit » ; deux lettres inversées. Fahrenheit 32 (2007), à ne pas confondre avec le Fahrenheit d'origine" },
];

/** Ce qui reste sans réponse, et ce qu'on en fait. */
const NON_RESOLU: string[] = [
  "#164 Escada · « Tadj » — pas clairement un doublon du « Taj Sunset » publié : une douzaine",
  "     de parfums du Golfe s'appellent Taj, et « Tadj » transcrit تاج en français.",
  "#166 et #167 Fendi · « Fendi » et « Fendi Fendi » — ne pas fusionner. Ce fournisseur tronque",
  "     par le DÉBUT, donc un « FENDI » nu est plus vraisemblablement la queue de « Fan di",
  "     Fendi » que l'éponyme de 1985, qui ne circule qu'en vintage de collection.",
  "#171 Franck Olivier · « Eau de Passion » — franckolivier.fr écrit « Eau de passion », p",
  "     minuscule : stylisation du site plutôt qu'orthographe. Laissé en casse de titre.",
  "À identifier, flacon en main : Maryam · The One · Cartier · Essentiel Perfumes · Sofe · Caramel.",
];

/*
 * Les slugs viennent des générateurs de l'app, pas d'une copie locale.
 *
 * Ce script avait sa propre `slugifie()`, sans le préfixe `p-<id>-` que pose
 * `perfumeSlug()`. Chaque fiche qu'il touchait repartait donc hors convention,
 * et changeait de slug au premier enregistrement depuis l'admin. Une règle de
 * nommage qui existe en deux exemplaires finit toujours par diverger.
 */

function cle(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function slugLibrePourParfum(
  tx: Prisma.TransactionClient,
  racineDemandee: string,
  saufId?: number,
): Promise<string> {
  const racine = racineDemandee;
  let slug = racine;
  for (let n = 2; ; n++) {
    const pris = await tx.perfume.findFirst({
      where: saufId ? { slug, NOT: { id: saufId } } : { slug },
      select: { id: true },
    });
    if (!pris) return slug;
    slug = `${racine}-${n}`;
  }
}

async function main() {
  console.log(`\n${APPLIQUER ? "ÉCRITURE" : "ESSAI À BLANC"} — correction des références de stock\n`);

  if (RENOMMAGES.length === 0 && AJOUTS.length === 0) {
    console.log("Aucune correction inscrite dans le script. Rien à faire.\n");
    await prisma.$disconnect();
    return;
  }

  // ── Contrôle avant tout : les fiches à renommer existent-elles, et
  //    portent-elles bien le nom qu'on croit ? Si le nom a changé depuis la
  //    recherche, on s'arrête : renommer une fiche qu'on n'a pas identifiée
  //    reviendrait à écraser le travail de quelqu'un d'autre.
  const anomalies: string[] = [];
  for (const r of RENOMMAGES) {
    const fiche = await prisma.perfume.findUnique({
      where: { id: r.id },
      select: { name: true, status: true, brand: { select: { name: true } } },
    });
    if (!fiche) {
      anomalies.push(`#${r.id} introuvable — attendu « ${r.avant} »`);
      continue;
    }
    if (cle(fiche.name) !== cle(r.avant)) {
      anomalies.push(`#${r.id} porte « ${fiche.name} », le script attendait « ${r.avant} »`);
    }
    if (fiche.status !== "DRAFT") {
      anomalies.push(`#${r.id} « ${fiche.name} » est ${fiche.status} — renommer une fiche en ligne change ce que voit un client`);
    }
  }

  if (anomalies.length > 0) {
    console.log("ARRÊT — la base ne correspond pas à ce que le script attend :\n");
    for (const a of anomalies) console.log(`  ${a}`);
    console.log("");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`--- RENOMMAGES (${RENOMMAGES.length}) ---`);
  for (const r of RENOMMAGES) {
    console.log(`  #${r.id}  « ${r.avant} »  →  ${r.marque} · « ${r.nom} »`);
    console.log(`         ${r.pourquoi}`);
  }

  /*
   * Un ajout déjà présent est sauté, pas dupliqué.
   *
   * Sans ce filtre, relancer le script — ce qui arrive dès qu'on ajoute une
   * ligne à la liste — recréerait tout ce qu'il a déjà créé. La comparaison
   * ignore accents, casse et ponctuation : « Matiere Noire » retrouve bien la
   * fiche « Matière Noire » si elle existe.
   */
  const marquesVisees = [...new Set(AJOUTS.map((a) => a.marque))];
  const fichesExistantes = await prisma.perfume.findMany({
    where: { brand: { name: { in: marquesVisees } } },
    select: { name: true, brand: { select: { name: true } } },
  });
  const empreintes = new Set(fichesExistantes.map((f) => `${cle(f.brand.name)}|${cle(f.name)}`));

  const ajoutsReels = AJOUTS.filter((a) => !empreintes.has(`${cle(a.marque)}|${cle(a.nom)}`));
  const ajoutsSautes = AJOUTS.filter((a) => empreintes.has(`${cle(a.marque)}|${cle(a.nom)}`));

  console.log(`\n--- AJOUTS (${ajoutsReels.length}) ---`);
  for (const a of ajoutsReels) {
    console.log(`  ${a.marque} · « ${a.nom} »`);
    console.log(`         ${a.pourquoi}`);
  }

  if (ajoutsSautes.length > 0) {
    console.log(`\n--- DÉJÀ AU CATALOGUE, sautés (${ajoutsSautes.length}) ---`);
    for (const a of ajoutsSautes) console.log(`  ${a.marque} · « ${a.nom} »`);
  }

  if (NON_RESOLU.length > 0) {
    console.log(`\n--- TOUJOURS SANS RÉPONSE (${NON_RESOLU.length}) ---`);
    for (const n of NON_RESOLU) console.log(`  ${n}`);
  }

  if (!APPLIQUER) {
    console.log("\nEssai à blanc terminé. Pour écrire : ajouter --appliquer\n");
    await prisma.$disconnect();
    return;
  }

  const enLigneAvant = await prisma.perfume.count({
    where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
  });

  let renommes = 0;
  let ajoutes = 0;
  let marquesCreees = 0;

  await prisma.$transaction(
    async (tx) => {
      // Les marques nécessaires, existantes ou à créer.
      const besoins = [...RENOMMAGES.map((r) => r.marque), ...ajoutsReels.map((a) => a.marque)];
      const existantes = await tx.brand.findMany({ select: { id: true, name: true } });
      const parMarque = new Map(existantes.map((b) => [cle(b.name), b.id]));

      for (const nom of besoins) {
        if (parMarque.has(cle(nom))) continue;
        let slug = brandSlug(nom);
        for (let n = 2; await tx.brand.findUnique({ where: { slug }, select: { id: true } }); n++) {
          slug = `${brandSlug(nom)}-${n}`;
        }
        const creee = await tx.brand.create({
          data: { name: normaliseMarque(nom), slug, status: "DRAFT", catalogMode: "CURATED" },
        });
        parMarque.set(cle(nom), creee.id);
        marquesCreees++;
      }

      for (const r of RENOMMAGES) {
        const brandId = parMarque.get(cle(r.marque));
        if (!brandId) throw new Error(`Marque introuvable : ${r.marque}`);
        const slug = await slugLibrePourParfum(tx, perfumeSlug(r.id, r.nom, r.marque), r.id);
        await tx.perfume.update({
          where: { id: r.id },
          data: { name: normaliseParfum(r.nom), slug, brandId },
        });
        renommes++;
      }

      for (const a of ajoutsReels) {
        const brandId = parMarque.get(cle(a.marque));
        if (!brandId) throw new Error(`Marque introuvable : ${a.marque}`);
        // `perfumeSlug()` a besoin de l'id, que seule la création donne : on pose
        // un slug provisoire, puis le définitif.
        const cree = await tx.perfume.create({
          data: {
            name: normaliseParfum(a.nom),
            slug: `tmp-${brandId}-${cle(a.nom)}`,
            brandId,
            image: "",
            status: "DRAFT",
          },
        });
        await tx.perfume.update({
          where: { id: cree.id },
          data: {
            slug: await slugLibrePourParfum(tx, perfumeSlug(cree.id, a.nom, a.marque), cree.id),
          },
        });
        ajoutes++;
      }
    },
    { timeout: 120_000 },
  );

  const enLigneApres = await prisma.perfume.count({
    where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
  });

  console.log(`\n${renommes} fiches renommées, ${ajoutes} créées, ${marquesCreees} marques créées.`);
  console.log(
    `Parfums visibles sur le site : ${enLigneAvant} avant, ${enLigneApres} après ${
      enLigneAvant === enLigneApres ? "— rien n'a fui vers la vitrine." : "— ATTENTION, ÉCART."
    }`,
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

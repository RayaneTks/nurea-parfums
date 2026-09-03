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
    id: 189,
    avant: "Pégase Royal",
    marque: "Parfums de Marly",
    nom: "Pegasus",
    pourquoi: "aucun Guerlain ne s'appelle Pégase. C'est le Pegasus de Parfums de Marly (2011), francisé par le fournisseur. « Royal » vient de la mention ROYAL ESSENCE imprimée sur le flacon, pas du nom : le catalogue officiel ne compte que Pegasus et Pegasus Exclusif",
  },
  {
    id: 188,
    avant: "Rouge Smoking",
    marque: "BDK Parfums",
    nom: "Rouge Smoking",
    pourquoi: "le nom est juste, la marque non : Rouge Smoking est un BDK Parfums (2019), pas un Guerlain",
  },
  {
    id: 187,
    avant: "Oud Maracujá",
    marque: "Maison Crivelli",
    nom: "Oud Maracujá",
    pourquoi: "nom déposé de Maison Crivelli, accent compris, extrait 32 %. Aucun Guerlain ne contient de fruit de la passion",
  },
  {
    id: 141,
    avant: "J'adore Lumière",
    marque: "Dior",
    nom: "J'adore Eau Lumière",
    pourquoi: "le nom officiel porte « Eau », que le fournisseur a sauté",
  },
  {
    id: 206,
    avant: "Blanc",
    marque: "Lacoste",
    nom: "L.12.12 Blanc",
    pourquoi: "nom officiel complet chez Lacoste ; aligné sur ses deux sœurs de gamme",
  },
  {
    id: 207,
    avant: "Noir",
    marque: "Lacoste",
    nom: "L.12.12 Noir",
    pourquoi: "nom officiel complet chez Lacoste ; aligné sur ses deux sœurs de gamme",
  },
  {
    id: 208,
    avant: "Blue",
    marque: "Lacoste",
    nom: "L.12.12 Bleu",
    pourquoi: "« Blue » est le libellé d'export ; Lacoste France écrit L.12.12 Bleu, comme Blanc et Noir déjà en base",
  },
  {
    id: 237,
    avant: "One Million Lucky",
    marque: "Rabanne",
    nom: "1 Million Lucky",
    pourquoi: "la marque écrit le chiffre, pas le mot — cohérent avec « 1 Million » et « 1 Million Elixir » déjà au catalogue",
  },
  {
    id: 126,
    avant: "212 VIP Women",
    marque: "Carolina Herrera",
    nom: "212 VIP",
    pourquoi: "« Women » est une mention de genre ajoutée par les revendeurs, pas une partie du nom commercial",
  },
];

const AJOUTS: Ajout[] = [
  // ── Louis Vuitton ─────────────────────────────────────────
  // Liste envoyée par Rayane. Sept des dix-sept étaient déjà au catalogue
  // (Afternoon Swim, Attrape-Rêves, Contre Moi, Imagination, L'Immensité,
  // Sur la Route, Symphony) — ils ne sont pas repris ici.
  { marque: "Louis Vuitton", nom: "Cactus Garden", pourquoi: "2019, Jacques Cavallier Belletrud — orthographe officielle confirmée" },
  { marque: "Louis Vuitton", nom: "Fantasmagory", pourquoi: "écrit « Fantasmagorie » sur la liste ; le nom officiel est anglais, sans e final (Les Extraits, 2025)" },
  { marque: "Louis Vuitton", nom: "LV Lovers", pourquoi: "écrit « Lvers » ; le flacon porte LVERS, la boutique LV le vend sous « LV Lovers » (Pharrell, 2024)" },
  { marque: "Louis Vuitton", nom: "Matière Noire", pourquoi: "écrit « Matière noir » ; le nom est féminin et accordé : Matière Noire (2016)" },
  { marque: "Louis Vuitton", nom: "Météore", pourquoi: "2020 — deux accents aigus, absents de la liste" },
  { marque: "Louis Vuitton", nom: "Ombre Nomade", pourquoi: "2018 — orthographe officielle confirmée" },
  { marque: "Louis Vuitton", nom: "On the Beach", pourquoi: "2022 — « the » en minuscule dans le nom officiel LV" },
  { marque: "Louis Vuitton", nom: "Pacific Chill", pourquoi: "2023 — orthographe officielle confirmée" },
  { marque: "Louis Vuitton", nom: "Stellar Times", pourquoi: "2021 — orthographe officielle confirmée" },
  // ── Identifiés dans la colonne « à identifier » ──────────────────
  { marque: "Guy Laroche", nom: "Drakkar Noir", pourquoi: "« NOIR » sous une marque écrite « DRÂKAR ». Guy Laroche n'a que quatre parfums, dont trois Drakkar, et aucun ne s'appelle « Noir » seul" },
  { marque: "Gissah", nom: "Imperial Valley", pourquoi: "correspondance exacte : Gissah (Koweït) référence G00093, EDP 200 ml mixte. Marqué non disponible à la vente chez la marque, ce qui colle à une revente de lot" },
];

/** Ce qui reste sans réponse, et ce qu'on en fait. */
const NON_RESOLU: string[] = [
  "#131 Chanel · « Gris Montagne » — ce n'est pas un Chanel, la maison n'a aucun « Gris ». Mais",
  "     deux flacons portent « GRIS MONTAIGNE » : le Dior Collection Privée d'avant 2017",
  "     (~230 €, rebaptisé Gris Dior depuis) et le clone Ard Al Zaafaran (~10 €). Renommer",
  "     en « Gris Dior » effacerait la seule chaîne qui permet de retrouver le flacon.",
  "#164 Escada · « Tadj » — pas clairement un doublon du « Taj Sunset » publié : une douzaine",
  "     de parfums du Golfe s'appellent Taj, et « Tadj » transcrit تاج en français.",
  "#166 et #167 Fendi · « Fendi » et « Fendi Fendi » — ne pas fusionner. Ce fournisseur tronque",
  "     par le DÉBUT, donc un « FENDI » nu est plus vraisemblablement la queue de « Fan di",
  "     Fendi » que l'éponyme de 1985, qui ne circule qu'en vintage de collection.",
  "#171 Franck Olivier · « Eau de Passion » — franckolivier.fr écrit « Eau de passion », p",
  "     minuscule : stylisation du site plutôt qu'orthographe. Laissé en casse de titre.",
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

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
    id: 117,
    avant: "You Powerfully",
    marque: "Giorgio Armani",
    nom: "Emporio Armani Stronger With You Powerfully",
    pourquoi: "nom tronqué par le début : le fournisseur n'a gardé que la fin. Page officielle armani.com, ligne Emporio Armani. Aucun autre parfum au monde ne porte le mot Powerfully",
  },
  {
    id: 272,
    avant: "Fantastic Basilic",
    marque: "Montale",
    nom: "Fantastic Basilic",
    pourquoi: "le nom est juste, la marque non : c'est un Montale (EDP 100 ml, EAN 3760260458450), pas un Versace. Absorbe aussi l'entrée isolée « Fantastic - Basilic » de la colonne à identifier",
  },
  {
    id: 138,
    avant: "Red",
    marque: "Diesel",
    nom: "D Red",
    pourquoi: "ligne « D by Diesel », intitulé officiel D RED sur diesel.com. Diesel n'a que deux références contenant Red, et l'autre serait écrite « Loverdose ». Concentration à lire sur le flacon : EDP 2024 ou Le Parfum 2025",
  },
  {
    id: 248,
    avant: "La Note",
    marque: "Roberto Cavalli",
    nom: "La Notte",
    pourquoi: "même geste que « Aqua di Gio » vers Acqua di Giò : la finale italienne est mangée. Attention, un « Uomo La Notte » masculin existe aussi, sortis en duo en 2018",
  },
  {
    id: 235,
    avant: "Bronze Goddess",
    marque: "Estée Lauder",
    nom: "Bronze Goddess",
    pourquoi: "le nom est juste, la marque non : Bronze Goddess est un Estée Lauder. Le catalogue Nina Ricci n'a ni Bronze ni Goddess. Onze déclinaisons existent, la concentration est à lire sur le flacon",
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
const NON_RESOLU: string[] = [];

function slugifie(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sans-nom"
  );
}

function cle(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function slugLibrePourParfum(
  tx: Prisma.TransactionClient,
  base: string,
  saufId?: number,
): Promise<string> {
  const racine = slugifie(base);
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
        let slug = slugifie(nom);
        for (let n = 2; await tx.brand.findUnique({ where: { slug }, select: { id: true } }); n++) {
          slug = `${slugifie(nom)}-${n}`;
        }
        const creee = await tx.brand.create({
          data: { name: nom, slug, status: "DRAFT", catalogMode: "CURATED" },
        });
        parMarque.set(cle(nom), creee.id);
        marquesCreees++;
      }

      for (const r of RENOMMAGES) {
        const brandId = parMarque.get(cle(r.marque));
        if (!brandId) throw new Error(`Marque introuvable : ${r.marque}`);
        const slug = await slugLibrePourParfum(tx, `${r.marque} ${r.nom}`, r.id);
        await tx.perfume.update({
          where: { id: r.id },
          data: { name: r.nom, slug, brandId },
        });
        renommes++;
      }

      for (const a of ajoutsReels) {
        const brandId = parMarque.get(cle(a.marque));
        if (!brandId) throw new Error(`Marque introuvable : ${a.marque}`);
        const slug = await slugLibrePourParfum(tx, `${a.marque} ${a.nom}`);
        await tx.perfume.create({
          data: { name: a.nom, slug, brandId, image: "", status: "DRAFT" },
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

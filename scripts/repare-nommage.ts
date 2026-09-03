/**
 * Rattrapage des noms et des slugs du catalogue.
 *
 *   Essai à blanc : npx dotenv -e .env.local -- npx tsx scripts/repare-nommage.ts
 *   Écriture      : … scripts/repare-nommage.ts --appliquer
 *
 * Deux dégâts à réparer, tous deux constatés en base.
 *
 * 1. DIX MARQUES ONT UN SLUG AMPUTÉ — azaro, burbery, carolina-herera, ceruti,
 *    cred, dolce-gabana, guci, hugo-bos, louis-vuiton, rabane. Toutes perdent
 *    une consonne doublée : zz, rr, bb, cc, ss, tt, nn, ee. Ce ne sont pas dix
 *    fautes de frappe, c'est un ancien générateur qui écrasait les lettres
 *    répétées. Les slugs de parfums en portent la trace aussi — god-girl pour
 *    Good Girl, eau-pasion pour Eau Passion.
 *
 *    Ce que ça coûte : le slug de marque est la valeur du filtre public
 *    ?maison=. La vitrine affiche donc « louis-vuiton » dans ses URL
 *    partageables. Et brandSlug(), le générateur actuel, produit
 *    « louis-vuitton » — donc le jour où quelqu'un renomme la marque depuis
 *    l'admin, le slug change tout seul et les liens d'hier meurent sans
 *    prévenir. Mieux vaut le corriger une fois, sciemment.
 *
 * 2. LES SLUGS DE PARFUMS NE SUIVENT PAS LA CONVENTION. perfumeSlug() produit
 *    p-<id>-<marque>-<nom> ; les fiches créées par script portaient un
 *    <marque>-<nom> sans préfixe. Sans conséquence publique — le type Perfume
 *    de la vitrine n'a même pas de champ slug — mais la fiche changeait de slug
 *    au premier enregistrement depuis l'admin.
 *
 * Ce qui n'est PAS touché : les noms déjà correctement cassés. La mise en forme
 * ne s'applique qu'aux noms dont normalise* change quelque chose, et cette
 * fonction refuse de toucher aux mots seuls en capitales — « MYSLF » est le
 * vrai nom du parfum d'Yves Saint Laurent, pas une étourderie.
 */

import { PrismaClient } from "@prisma/client";
import { normaliseMarque, normaliseParfum } from "../src/lib/nommage";
import { brandSlug, perfumeSlug } from "../src/lib/slugify";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

type ChangementMarque = {
  id: string;
  nomAvant: string;
  nomApres: string;
  slugAvant: string;
  slugApres: string;
  publiee: boolean;
  parfums: number;
};

type ChangementParfum = {
  id: number;
  marque: string;
  nomAvant: string;
  nomApres: string;
  slugAvant: string;
  slugApres: string;
};

async function main() {
  console.log(`\n${APPLIQUER ? "ÉCRITURE" : "ESSAI À BLANC"} — rattrapage nommage catalogue\n`);

  const marques = await prisma.brand.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: { select: { perfumes: true } },
    },
    orderBy: { name: "asc" },
  });

  /*
   * Les slugs occupés, pour ne pas créer de collision en cours de route.
   *
   * Corriger « guci » en « gucci » est sans risque, mais si une autre marque
   * portait déjà « gucci », l'update échouerait au milieu du lot. On réserve
   * donc chaque slug au fur et à mesure.
   */
  const slugsPris = new Set(marques.map((b) => b.slug));

  const changementsMarques: ChangementMarque[] = [];
  for (const b of marques) {
    const nomApres = normaliseMarque(b.name);
    let slugApres = brandSlug(nomApres);
    if (slugApres !== b.slug) {
      const racine = slugApres;
      for (let n = 2; slugsPris.has(slugApres); n++) slugApres = `${racine}-${n}`;
    }
    if (nomApres === b.name && slugApres === b.slug) continue;
    slugsPris.delete(b.slug);
    slugsPris.add(slugApres);
    changementsMarques.push({
      id: b.id,
      nomAvant: b.name,
      nomApres,
      slugAvant: b.slug,
      slugApres,
      publiee: b.status === "PUBLISHED",
      parfums: b._count.perfumes,
    });
  }

  const parfums = await prisma.perfume.findMany({
    select: { id: true, name: true, slug: true, brand: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });

  // Le nom de marque retenu pour bâtir le slug parfum est celui d'APRÈS
  // correction : sinon « p-65-carolina-herera-… » resterait fauté.
  const nomMarqueApres = new Map(marques.map((b) => [b.id, normaliseMarque(b.name)]));

  const changementsParfums: ChangementParfum[] = [];
  for (const p of parfums) {
    const nomApres = normaliseParfum(p.name);
    const marque = nomMarqueApres.get(p.brand.id) ?? p.brand.name;
    const slugApres = perfumeSlug(p.id, nomApres, marque);
    if (nomApres === p.name && slugApres === p.slug) continue;
    changementsParfums.push({
      id: p.id,
      marque,
      nomAvant: p.name,
      nomApres,
      slugAvant: p.slug,
      slugApres,
    });
  }

  const renommagesReels = changementsParfums.filter((c) => c.nomAvant !== c.nomApres);
  const marquesRenommees = changementsMarques.filter((c) => c.nomAvant !== c.nomApres);
  const filtresCasses = changementsMarques.filter((c) => c.publiee && c.slugAvant !== c.slugApres);

  console.log(`--- MARQUES : ${changementsMarques.length} à corriger sur ${marques.length} ---`);
  for (const c of changementsMarques) {
    const nom = c.nomAvant === c.nomApres ? c.nomAvant : `${c.nomAvant} → ${c.nomApres}`;
    console.log(`  ${nom.padEnd(24)} "${c.slugAvant}" → "${c.slugApres}"   (${c.parfums} parfums)`);
  }

  console.log(`\n--- PARFUMS : ${changementsParfums.length} à corriger sur ${parfums.length} ---`);
  console.log(`  dont ${renommagesReels.length} dont le NOM change :`);
  for (const c of renommagesReels) {
    console.log(`    #${c.id} ${c.marque} — "${c.nomAvant}" → "${c.nomApres}"`);
  }
  console.log(
    `  les ${changementsParfums.length - renommagesReels.length} autres ne changent que de slug.`,
  );

  if (marquesRenommees.length > 0) {
    console.log(`\n  ATTENTION — ${marquesRenommees.length} marque(s) changent de NOM, à relire :`);
    for (const c of marquesRenommees) console.log(`    "${c.nomAvant}" → "${c.nomApres}"`);
  }

  /*
   * Le seul effet visible côté client, et il faut le dire clairement.
   *
   * Un lien de filtre déjà partagé — /?maison=louis-vuiton — ne renverra plus
   * rien. Ce n'est pas une page produit, ce n'est pas dans le sitemap, et ça ne
   * casse aucune fiche : ça vide un filtre.
   */
  if (filtresCasses.length > 0) {
    console.log(`\n--- LIENS DE FILTRE PUBLICS QUI CHANGENT (${filtresCasses.length}) ---`);
    for (const c of filtresCasses) {
      console.log(`  /?maison=${c.slugAvant}  →  /?maison=${c.slugApres}`);
    }
  }

  if (!APPLIQUER) {
    console.log("\nEssai à blanc terminé. Pour écrire : ajouter --appliquer\n");
    await prisma.$disconnect();
    return;
  }

  const enLigneAvant = await prisma.perfume.count({
    where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
  });

  await prisma.$transaction(
    async (tx) => {
      /*
       * Les slugs passent par une valeur de garage.
       *
       * slug est unique. Corriger « azaro » en « azzaro » alors qu'une autre
       * ligne du même lot libère justement « azzaro » fait échouer la
       * transaction sur une collision passagère. On gare donc tout le lot sur
       * des slugs temporaires, puis on pose les définitifs.
       */
      for (const c of changementsMarques) {
        if (c.slugAvant === c.slugApres) continue;
        await tx.brand.update({ where: { id: c.id }, data: { slug: `tmp-${c.id}` } });
      }
      for (const c of changementsMarques) {
        await tx.brand.update({
          where: { id: c.id },
          data: { name: c.nomApres, slug: c.slugApres },
        });
      }

      for (const c of changementsParfums) {
        if (c.slugAvant === c.slugApres) continue;
        await tx.perfume.update({ where: { id: c.id }, data: { slug: `tmp-p-${c.id}` } });
      }
      for (const c of changementsParfums) {
        await tx.perfume.update({
          where: { id: c.id },
          data: { name: c.nomApres, slug: c.slugApres },
        });
      }
    },
    { timeout: 180_000 },
  );

  const enLigneApres = await prisma.perfume.count({
    where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
  });

  console.log(
    `\n${changementsMarques.length} marques et ${changementsParfums.length} parfums corrigés.`,
  );
  console.log(
    `Parfums visibles sur le site : ${enLigneAvant} avant, ${enLigneApres} après ${
      enLigneAvant === enLigneApres
        ? "— aucune fiche n'a changé de visibilité."
        : "— ATTENTION, ÉCART."
    }`,
  );
  console.log(
    "\nLa vitrine sert un instantané en cache : la clé du cache catalogue a été\n" +
      "passée en v2 dans le code, le prochain déploiement recharge les nouveaux slugs.\n",
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

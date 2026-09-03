/**
 * Ajout au catalogue des références de la liste de stock.
 *
 *   Essai à blanc : npx dotenv -e .env.local -- npx tsx scripts/stock-a-creer.ts
 *   Écriture      : … scripts/stock-a-creer.ts --appliquer
 *
 * Les parfums naissent MASQUÉS et sans visuel : ils ne peuvent donc pas
 * atteindre la vitrine, qui filtre sur le statut. Les photos viendront ensuite,
 * et c'est seulement en les ajoutant qu'on pourra publier.
 *
 * Deux règles de transcription, appliquées à la liste papier :
 *
 * 1. Les MARQUES sont ramenées à leur nom réel et à celui déjà en base :
 *    « PARADA » → Prada, « CARTIE » → Cartier, « JPG » → Jean Paul Gaultier,
 *    « VICTOR & ROLF » → Viktor & Rolf, « MONBLANC » → Montblanc,
 *    « ARMANI » → Giorgio Armani, « NAUTICAL » → Nautica. Sinon la même maison
 *    se dédoublerait sur la vitrine.
 *
 * 2. Les NOMS de parfum sont corrigés quand l'orthographe réelle est certaine
 *    (« Aqua di Gio » → Acqua di Giò, « Anais Anais » → Anaïs Anaïs). Quand
 *    elle ne l'est pas, on GARDE le mot de la liste : inventer une référence
 *    voisine mettrait au catalogue un parfum qui n'est pas dans le stock.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLIQUER = process.argv.includes("--appliquer");

type Entree = { marque: string; nom: string; note?: string };

/**
 * La liste, marque par marque, telle que transcrite.
 *
 * Les doublons internes ne sont pas répétés : « Wanted Girl » figure sous
 * AZZARO et AZZARO (FEMME), « Scandal » sous JPG et JEAN PAUL GAULTIER,
 * « Tiger Lily » et « Bonbon » sous VERSACE, VICTOR & ROLF et VIKTOR & ROLF —
 * une seule entrée à chaque fois, sous la marque qui les fabrique réellement.
 */
const LISTE: Entree[] = [
  // ── Asdaaf ────────────────────────────────────────────────────────────
  { marque: "Asdaaf", nom: "Ameerat Al Arab" },

  // ── Giorgio Armani ────────────────────────────────────────────────────
  { marque: "Giorgio Armani", nom: "Sì" },
  { marque: "Giorgio Armani", nom: "My Way" },
  { marque: "Giorgio Armani", nom: "My Way Nectar" },
  { marque: "Giorgio Armani", nom: "You Powerfully", note: "nom conservé tel quel — non identifié avec certitude" },
  { marque: "Giorgio Armani", nom: "Acqua di Giò" },

  // ── Azzaro ────────────────────────────────────────────────────────────
  { marque: "Azzaro", nom: "Azzaro pour Homme", note: "« Classic » sur la liste" },
  { marque: "Azzaro", nom: "The Most Wanted" },
  { marque: "Azzaro", nom: "Chrome" },
  { marque: "Azzaro", nom: "Wanted Girl" },
  { marque: "Azzaro", nom: "Wanted by Night" },

  // ── Burberry ──────────────────────────────────────────────────────────
  { marque: "Burberry", nom: "Goddess" },

  // ── Cacharel ──────────────────────────────────────────────────────────
  // Amor Amor, Anaïs Anaïs, Eden et Yes I Am sont déjà au catalogue.

  // ── Calvin Klein ──────────────────────────────────────────────────────
  { marque: "Calvin Klein", nom: "Eternity" },

  // ── Carolina Herrera ──────────────────────────────────────────────────
  { marque: "Carolina Herrera", nom: "212 VIP Women" },
  { marque: "Carolina Herrera", nom: "Very Good Girl" },

  // ── Chanel ────────────────────────────────────────────────────────────
  { marque: "Chanel", nom: "Chance" },
  { marque: "Chanel", nom: "Chance Eau Tendre" },
  { marque: "Chanel", nom: "Égoïste" },
  { marque: "Chanel", nom: "Gris Montagne", note: "« Chanel G (Gris Montagne) » sur la liste" },

  // ── Chloé ─────────────────────────────────────────────────────────────
  { marque: "Chloé", nom: "See by Chloé" },
  { marque: "Chloé", nom: "Nomade" },
  { marque: "Chloé", nom: "Nomade Absolu de Parfum" },
  { marque: "Chloé", nom: "Chloé Eau de Parfum", note: "« Chloé de Chloé » sur la liste" },
  { marque: "Chloé", nom: "Love Story" },

  // ── Diesel ────────────────────────────────────────────────────────────
  { marque: "Diesel", nom: "Fuel for Life" },
  { marque: "Diesel", nom: "Red", note: "nom conservé tel quel — non identifié avec certitude" },
  { marque: "Diesel", nom: "Sound of the Brave" },

  // ── Dior ──────────────────────────────────────────────────────────────
  { marque: "Dior", nom: "Poison Girl" },
  { marque: "Dior", nom: "J'adore Lumière" },
  { marque: "Dior", nom: "Addict" },
  { marque: "Dior", nom: "J'adore" },
  { marque: "Dior", nom: "Ambre Nuit" },
  { marque: "Dior", nom: "Bois d'Argent" },
  { marque: "Dior", nom: "Sauvage" },
  { marque: "Dior", nom: "Rouge Trafalgar" },
  { marque: "Dior", nom: "Dior Homme Intense" },

  // ── Dolce & Gabbana ───────────────────────────────────────────────────
  { marque: "Dolce & Gabbana", nom: "Devotion" },
  { marque: "Dolce & Gabbana", nom: "L'Impératrice" },
  { marque: "Dolce & Gabbana", nom: "The One" },
  { marque: "Dolce & Gabbana", nom: "Dolce Peony" },
  { marque: "Dolce & Gabbana", nom: "The One for Men", note: "« The One /H » sur la liste" },
  { marque: "Dolce & Gabbana", nom: "DGVIB3", note: "« DGVIB 3/U » sur la liste" },
  { marque: "Dolce & Gabbana", nom: "The Only One" },
  { marque: "Dolce & Gabbana", nom: "The One Gold" },
  { marque: "Dolce & Gabbana", nom: "Light Blue Forever", note: "« Light Blue Interdit » sur la liste — à confirmer" },
  { marque: "Dolce & Gabbana", nom: "K by Dolce & Gabbana", note: "« King » sur la liste" },
  { marque: "Dolce & Gabbana", nom: "Light Blue Love is Love" },
  { marque: "Dolce & Gabbana", nom: "The One Luminous Night" },
  { marque: "Dolce & Gabbana", nom: "Light Blue" },

  // ── Dove ──────────────────────────────────────────────────────────────
  { marque: "Dove", nom: "Dove" },

  // ── Escada ────────────────────────────────────────────────────────────
  { marque: "Escada", nom: "Bali Paradise" },
  { marque: "Escada", nom: "Tadj", note: "« Tadj » sur la liste — proche de « Taj Sunset » déjà au catalogue" },
  { marque: "Escada", nom: "Poudre", note: "nom conservé tel quel — non identifié avec certitude" },

  // ── Fendi ─────────────────────────────────────────────────────────────
  { marque: "Fendi", nom: "Fendi" },
  { marque: "Fendi", nom: "Fendi Fendi", note: "nom conservé tel quel" },

  // ── Franck Olivier ────────────────────────────────────────────────────
  { marque: "Franck Olivier", nom: "Nature" },
  { marque: "Franck Olivier", nom: "Miss" },
  { marque: "Franck Olivier", nom: "Bella" },
  { marque: "Franck Olivier", nom: "Eau de Passion" },
  { marque: "Franck Olivier", nom: "Sun Java Black" },
  { marque: "Franck Olivier", nom: "Sun Java White" },

  // ── Givenchy ──────────────────────────────────────────────────────────
  { marque: "Givenchy", nom: "L'Interdit Rouge" },
  { marque: "Givenchy", nom: "Live Irrésistible" },
  { marque: "Givenchy", nom: "Irrésistible" },
  { marque: "Givenchy", nom: "Hot Couture" },
  { marque: "Givenchy", nom: "Amarige" },
  { marque: "Givenchy", nom: "Organza" },
  { marque: "Givenchy", nom: "L'Interdit" },

  // ── Gucci ─────────────────────────────────────────────────────────────
  { marque: "Gucci", nom: "Envy Me" },
  { marque: "Gucci", nom: "Flora", note: "« Floral » sur la liste" },
  { marque: "Gucci", nom: "Bloom" },

  // ── Guerlain ──────────────────────────────────────────────────────────
  { marque: "Guerlain", nom: "Samsara" },
  { marque: "Guerlain", nom: "L'Instant de Guerlain" },
  { marque: "Guerlain", nom: "La Petite Robe Noire" },
  { marque: "Guerlain", nom: "Oud Maracujá" },
  { marque: "Guerlain", nom: "Rouge Smoking" },
  { marque: "Guerlain", nom: "Pégase Royal", note: "« Pegasus Royal » sur la liste" },

  // ── Hermès ────────────────────────────────────────────────────────────
  { marque: "Hermès", nom: "Terre d'Hermès" },

  // ── Jean Paul Gaultier ────────────────────────────────────────────────
  { marque: "Jean Paul Gaultier", nom: "Le Beau Paradise Garden" },
  { marque: "Jean Paul Gaultier", nom: "Le Male Lover" },
  { marque: "Jean Paul Gaultier", nom: "Scandal" },
  { marque: "Jean Paul Gaultier", nom: "Ultra Male" },
  { marque: "Jean Paul Gaultier", nom: "Le Male On Board" },
  { marque: "Jean Paul Gaultier", nom: "Le Male Le Parfum" },
  { marque: "Jean Paul Gaultier", nom: "Le Male Aviator" },
  { marque: "Jean Paul Gaultier", nom: "Le Beau" },
  { marque: "Jean Paul Gaultier", nom: "Le Male In Bleu" },
  { marque: "Jean Paul Gaultier", nom: "Le Beau Flower" },
  { marque: "Jean Paul Gaultier", nom: "Scandal Absolu" },
  { marque: "Jean Paul Gaultier", nom: "Le Male" },

  // ── Jo Malone ─────────────────────────────────────────────────────────
  { marque: "Jo Malone", nom: "Poppy & Barley" },

  // ── Joop! ─────────────────────────────────────────────────────────────
  { marque: "Joop!", nom: "Joop! Homme", note: "« Joop » sur la liste" },

  // ── Kenzo ─────────────────────────────────────────────────────────────
  { marque: "Kenzo", nom: "Flower by Kenzo" },

  // ── Lacoste ───────────────────────────────────────────────────────────
  { marque: "Lacoste", nom: "Blanc", note: "L.12.12 Blanc" },
  { marque: "Lacoste", nom: "Noir", note: "L.12.12 Noir" },
  { marque: "Lacoste", nom: "Blue", note: "L.12.12 Bleu" },
  { marque: "Lacoste", nom: "Challenge" },
  { marque: "Lacoste", nom: "Booster" },
  { marque: "Lacoste", nom: "Lacoste pour Homme", note: "« Homme » sur la liste" },
  { marque: "Lacoste", nom: "Pour Femme Légère" },
  { marque: "Lacoste", nom: "Elegant", note: "nom conservé tel quel — non identifié avec certitude" },
  { marque: "Lacoste", nom: "Touch of Pink" },

  // ── Lancôme ───────────────────────────────────────────────────────────
  { marque: "Lancôme", nom: "La Vie Est Belle" },
  { marque: "Lancôme", nom: "Trésor Midnight Rose" },
  { marque: "Lancôme", nom: "Idôle" },

  // ── Lanvin ────────────────────────────────────────────────────────────
  { marque: "Lanvin", nom: "Oxygène" },
  { marque: "Lanvin", nom: "Modern Princess" },

  // ── Lattafa ───────────────────────────────────────────────────────────
  { marque: "Lattafa", nom: "Yara" },
  { marque: "Lattafa", nom: "Yara Candy" },

  // ── Laverne ───────────────────────────────────────────────────────────
  { marque: "Laverne", nom: "Miss Laverne" },

  // ── Louis Vuitton ─────────────────────────────────────────────────────
  { marque: "Louis Vuitton", nom: "Attrape-Rêves" },

  // ── Mancera ───────────────────────────────────────────────────────────
  { marque: "Mancera", nom: "Coco Vanille" },
  { marque: "Mancera", nom: "Roses Vanille", note: "« Rose Vanille » sur la liste" },

  // ── Marc-Antoine Barrois ──────────────────────────────────────────────
  { marque: "Marc-Antoine Barrois", nom: "Ganymede" },

  // ── Marc Jacobs ───────────────────────────────────────────────────────
  { marque: "Marc Jacobs", nom: "Perfect" },

  // ── Montblanc ─────────────────────────────────────────────────────────
  { marque: "Montblanc", nom: "Legend" },
  { marque: "Montblanc", nom: "Legend Red" },
  { marque: "Montblanc", nom: "Legend Night" },

  // ── Montale ───────────────────────────────────────────────────────────
  { marque: "Montale", nom: "Fentastic", note: "nom conservé tel quel — non identifié avec certitude" },

  // ── Nautica ───────────────────────────────────────────────────────────
  { marque: "Nautica", nom: "Voyage" },

  // ── Nina Ricci ────────────────────────────────────────────────────────
  { marque: "Nina Ricci", nom: "Nina Rose" },
  { marque: "Nina Ricci", nom: "Premier Jour" },
  { marque: "Nina Ricci", nom: "Bronze Goddess", note: "nom conservé tel quel — Bronze Goddess est d'Estée Lauder" },

  // ── Rabanne ───────────────────────────────────────────────────────────
  { marque: "Rabanne", nom: "Olympéa", note: "« Olympe » sur la liste" },
  { marque: "Rabanne", nom: "One Million Lucky" },
  { marque: "Rabanne", nom: "Invictus Platinum" },
  { marque: "Rabanne", nom: "Invictus Victory" },
  { marque: "Rabanne", nom: "Invictus Victory Elixir" },
  { marque: "Rabanne", nom: "Strong Me", note: "nom conservé tel quel — non identifié avec certitude" },
  { marque: "Rabanne", nom: "1 Million" },
  { marque: "Rabanne", nom: "1 Million Elixir" },
  { marque: "Rabanne", nom: "Invictus" },
  { marque: "Rabanne", nom: "Major Me", note: "nom conservé tel quel — non identifié avec certitude" },

  // ── Ralph Lauren ──────────────────────────────────────────────────────
  { marque: "Ralph Lauren", nom: "Polo Ultra Blue" },
  { marque: "Ralph Lauren", nom: "Polo Red Intense" },

  // ── Roberto Cavalli ───────────────────────────────────────────────────
  { marque: "Roberto Cavalli", nom: "La Note", note: "nom conservé tel quel — non identifié avec certitude" },

  // ── Yves Rocher ───────────────────────────────────────────────────────
  { marque: "Yves Rocher", nom: "So Elixir", note: "« SO ELIXIR » en tête de colonne sur la liste" },

  // ── Sospiro ───────────────────────────────────────────────────────────
  { marque: "Sospiro", nom: "Vibrato" },
  { marque: "Sospiro", nom: "Accento" },

  // ── Valentino ─────────────────────────────────────────────────────────
  { marque: "Valentino", nom: "Born in Roma Yellow Dream" },
  { marque: "Valentino", nom: "Uomo Intense" },
  { marque: "Valentino", nom: "Valentino Uomo", note: "« Valentino » sur la liste" },

  // ── Viktor & Rolf ─────────────────────────────────────────────────────
  // Tiger Lily, Bonbon et Spicebomb Infrared figuraient aussi sous VERSACE
  // sur la liste : ce sont des Viktor & Rolf, ils n'entrent qu'une fois.
  { marque: "Viktor & Rolf", nom: "Flowerbomb Tiger Lily", note: "« Tiger Lily » sur la liste" },
  { marque: "Viktor & Rolf", nom: "Bonbon" },
  { marque: "Viktor & Rolf", nom: "Spicebomb Infrared" },

  // ── Victoria's Secret ─────────────────────────────────────────────────
  { marque: "Victoria's Secret", nom: "Wicked" },
  { marque: "Victoria's Secret", nom: "Bombshell" },
  { marque: "Victoria's Secret", nom: "Eau So Sexy" },
  { marque: "Victoria's Secret", nom: "Just a Kiss" },
  { marque: "Victoria's Secret", nom: "Bare Vanilla" },

  // ── Evaflor ───────────────────────────────────────────────────────────
  { marque: "Evaflor", nom: "Whisky Silver", note: "« WHISKY · Silver » sur la liste" },

  // ── Xerjoff ───────────────────────────────────────────────────────────
  { marque: "Xerjoff", nom: "Renaissance" },

  // ── Yves Saint Laurent ────────────────────────────────────────────────
  { marque: "Yves Saint Laurent", nom: "Black Opium" },
  { marque: "Yves Saint Laurent", nom: "Mon Paris" },

  // ── Zara ──────────────────────────────────────────────────────────────
  { marque: "Zara", nom: "Nude Bouquet" },
  { marque: "Zara", nom: "Wonder Rose" },
  { marque: "Zara", nom: "Rose" },
  { marque: "Zara", nom: "Gardenia", note: "« Gardinia » sur la liste" },
  { marque: "Zara", nom: "Orchid" },

  // ── Versace ───────────────────────────────────────────────────────────
  { marque: "Versace", nom: "Fantastic Basilic", note: "nom conservé tel quel — non identifié avec certitude" },
];

/**
 * Ce qu'on n'ajoute PAS, et pourquoi.
 *
 * La colonne « AUTRES / À IDENTIFIER » de la liste porte son nom : ce sont des
 * flacons que tu n'as pas encore identifiés. Les créer reviendrait à inscrire
 * au catalogue des références dont on ne connaît ni la marque ni le modèle —
 * exactement ce qu'on cherche à éviter.
 */
const ECARTES = [
  "مريم (Asdaaf) — nom arabe seul, marque et modèle incertains",
  "Cartie — déjà présent comme « à identifier » sur ta liste",
  "Sofe — marque et modèle inconnus",
  "The One Fragrance — marque et modèle inconnus",
  "Fantastic · Basilic — figure aussi sous Versace, doublon non identifié",
  "Noir (Drâkar) — probablement Drakkar Noir de Guy Laroche, à confirmer",
  "Imperial Valley, Essentiel Perfumes, Caramel — marques inconnues",
];

function slugifie(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sans-nom"
  );
}

/** Comparaison tolérante : accents, casse, ponctuation et espaces ignorés. */
function cle(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

async function main() {
  const marquesEnBase = await prisma.brand.findMany({ select: { id: true, name: true, slug: true } });
  const parfumsEnBase = await prisma.perfume.findMany({
    select: { name: true, brand: { select: { name: true } } },
  });

  const parMarque = new Map(marquesEnBase.map((m) => [cle(m.name), m]));
  const dejaLa = new Set(parfumsEnBase.map((p) => `${cle(p.brand.name)}::${cle(p.name)}`));

  const aCreer: Entree[] = [];
  const deja: Entree[] = [];
  const vus = new Set<string>();

  for (const e of LISTE) {
    const k = `${cle(e.marque)}::${cle(e.nom)}`;
    if (vus.has(k)) continue; // doublon interne à la liste
    vus.add(k);
    if (dejaLa.has(k)) deja.push(e);
    else aCreer.push(e);
  }

  const marquesNouvelles = [...new Set(aCreer.map((e) => e.marque))].filter(
    (m) => !parMarque.has(cle(m)),
  );

  /*
   * Les quasi-doublons.
   *
   * L'égalité stricte ne voit pas que « Tadj » et « Taj Sunset » désignent
   * peut-être le même flacon, ni que « Sun Java Black » recouvre à moitié
   * l'entrée « Sun Java Black / White » déjà en base. Ce sont exactement les
   * cas où une création silencieuse produit deux fiches pour un seul parfum.
   * On ne tranche pas à sa place : on les montre.
   */
  const proches: string[] = [];
  for (const e of aCreer) {
    const kn = cle(e.nom);
    for (const p of parfumsEnBase) {
      if (cle(p.brand.name) !== cle(e.marque)) continue;
      const ke = cle(p.name);
      if (kn === ke) continue;
      if (kn.includes(ke) || ke.includes(kn)) {
        proches.push(`${e.marque} · « ${e.nom} »  ↔  déjà en base : « ${p.name} »`);
      }
    }
  }

  console.log(
    APPLIQUER ? "\n=== ÉCRITURE EN BASE ===\n" : "\n=== ESSAI À BLANC — rien ne sera écrit ===\n",
  );
  console.log(`Catalogue actuel : ${parfumsEnBase.length} parfums, ${marquesEnBase.length} marques`);
  console.log(`Liste transcrite : ${LISTE.length} références, ${vus.size} après retrait des doublons internes`);
  console.log(`Déjà au catalogue : ${deja.length}`);
  console.log(`À créer : ${aCreer.length} parfums`);
  console.log(`Marques à créer : ${marquesNouvelles.length}${marquesNouvelles.length ? " — " + marquesNouvelles.join(", ") : ""}`);

  console.log("\n--- déjà présents, ignorés ---");
  for (const e of deja) console.log(`  ${e.marque} · ${e.nom}`);

  console.log("\n--- à créer ---");
  let m = "";
  for (const e of aCreer) {
    if (e.marque !== m) { m = e.marque; console.log(`\n  ${m}`); }
    console.log(`    ${e.nom}${e.note ? `   [${e.note}]` : ""}`);
  }

  if (proches.length > 0) {
    console.log("\n--- QUASI-DOUBLONS À TRANCHER ---");
    for (const x of proches) console.log(`  ${x}`);
  }

  console.log("\n--- écartés volontairement ---");
  for (const x of ECARTES) console.log(`  ${x}`);

  if (!APPLIQUER) {
    console.log("\nEssai à blanc terminé. Pour écrire : ajouter --appliquer\n");
    await prisma.$disconnect();
    return;
  }

  const enLigneAvant = await prisma.perfume.count({
    where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
  });

  let marquesCreees = 0;
  let parfumsCrees = 0;

  await prisma.$transaction(async (tx) => {
    for (const nom of marquesNouvelles) {
      let slug = slugifie(nom);
      for (let n = 2; await tx.brand.findUnique({ where: { slug }, select: { id: true } }); n++) {
        slug = `${slugifie(nom)}-${n}`;
      }
      // Marque MASQUÉE : sans elle, un parfum publié par erreur resterait
      // invisible, et rien ne peut atteindre la vitrine par accident.
      const creee = await tx.brand.create({
        data: { name: nom, slug, status: "DRAFT", catalogMode: "CURATED" },
      });
      parMarque.set(cle(nom), { id: creee.id, name: creee.name, slug: creee.slug });
      marquesCreees++;
    }

    for (const e of aCreer) {
      const marque = parMarque.get(cle(e.marque));
      if (!marque) throw new Error(`Marque introuvable après création : ${e.marque}`);

      let slug = slugifie(`${e.marque} ${e.nom}`);
      for (let n = 2; await tx.perfume.findUnique({ where: { slug }, select: { id: true } }); n++) {
        slug = `${slugifie(`${e.marque} ${e.nom}`)}-${n}`;
      }

      await tx.perfume.create({
        data: {
          name: e.nom,
          slug,
          brandId: marque.id,
          // Chaîne vide : la colonne est obligatoire, et l'app lit une chaîne
          // vide comme « pas encore de visuel ». C'est ce qui empêche la
          // publication tant que la photo manque.
          image: "",
          status: "DRAFT",
        },
      });
      parfumsCrees++;
    }
  }, { timeout: 120_000 });

  const enLigneApres = await prisma.perfume.count({
    where: { status: "PUBLISHED", brand: { status: "PUBLISHED" } },
  });

  console.log(`\n${marquesCreees} marques créées, ${parfumsCrees} parfums créés — tous masqués.`);
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

/**
 * L'orthographe des noms de marque et de parfum, en un seul endroit.
 *
 * Pourquoi ce fichier existe. Le catalogue s'écrit par trois portes — le
 * formulaire parfum, le sélecteur de marque, la saisie libre d'une vente — et
 * chacune posait la chaîne telle que tapée, après un simple `.trim()`. Deux
 * conséquences, toutes deux constatées en base :
 *
 *   1. « Louis Vuitton », « louis vuitton » et « LOUIS VUITTON » créaient
 *      TROIS marques. La recherche de marque existante se faisait sur
 *      `where: { name }`, une égalité exacte, sensible à la casse et aux
 *      accents.
 *   2. Le catalogue mélangeait les casses d'une ligne à l'autre.
 *
 * Deux fonctions répondent à deux questions différentes, et il ne faut pas les
 * confondre :
 *
 *   `cleNom`   — « est-ce le même nom ? » Sert à RETROUVER, jamais à afficher.
 *   `normalise*` — « comment l'écrire ? » Sert à ENREGISTRER.
 *
 * Règle qui gouverne tout le reste : **on ne recasse que ce dont on est sûr.**
 * Une saisie mixte est une intention — « eLVes », « DGVIB3 », « J'adore » — et
 * on n'y touche pas. Un mot seul tout en capitales est probablement un logo :
 * « MYSLF » est le nom réel du parfum d'Yves Saint Laurent, et le mettre en
 * casse de titre inventerait « Myslf ». Voir `fautMettreEnForme`, qui porte le
 * détail. Recasser aveuglément détruirait plus de noms qu'il n'en corrigerait.
 */

/**
 * Clé de comparaison : accents, casse, ponctuation et espaces ignorés.
 *
 * « L'Immensité », « l immensite » et « LIMMENSITE » donnent la même clé. On
 * s'en sert pour retrouver une marque déjà en base avant d'en créer une
 * seconde. Ne jamais afficher cette valeur : elle n'est pas un nom.
 */
export function cleNom(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Mots qui restent en minuscules au milieu d'un nom.
 *
 * « Light Blue pour Homme », « The One for Men », « Acqua di Giò » : les
 * maisons écrivent bien ces mots-outils en bas de casse. En tête de nom ils
 * reprennent leur majuscule — « The One », « La Nuit de l'Homme ».
 */
const MOTS_OUTILS = new Set([
  "a", "an", "and", "as", "at", "au", "aux", "by", "da", "das", "de", "del",
  "della", "der", "des", "di", "du", "e", "el", "en", "et", "for", "in", "la",
  "las", "le", "les", "lo", "los", "of", "on", "or", "par", "por", "pour",
  "sur", "the", "to", "un", "una", "une", "van", "von", "y",
]);

/**
 * Sigles qui gardent leurs majuscules.
 *
 * Une saisie tout en capitales ne dit pas si « VIP » est un sigle ou un mot
 * crié. Cette liste tranche pour les cas qu'on rencontre réellement en
 * parfumerie ; tout le reste passe en casse de titre. Un sigle absent d'ici se
 * corrige à la main une fois, puis la fiche existante sert de référence — voir
 * la note sur le rattrapage par le catalogue en bas de fichier.
 */
const SIGLES = new Set([
  "BDK", "CK", "DKNY", "EDC", "EDP", "EDT", "II", "III", "IV", "IX", "JPG",
  "LV", "MFK", "NYC", "UK", "USA", "VI", "VII", "VIII", "VIP", "XI", "XII",
  "XS", "XX", "XXL", "XXX", "YSL",
]);

/** Une saisie mixte porte une intention : « eLVes », « J'adore », « DGVIB3 ». */
function porteUneCasse(valeur: string): boolean {
  const lettres = valeur.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (lettres === "") return false;
  return lettres !== lettres.toLowerCase() && lettres !== lettres.toUpperCase();
}

/**
 * Faut-il mettre en forme cette saisie ?
 *
 * Les deux absences de casse ne se valent pas, et c'est la lecon d'un
 * contre-exemple trouve en base : « MYSLF » est le nom REEL du parfum d'Yves
 * Saint Laurent, ecrit en capitales par la maison. Le passer en casse de titre
 * donnait « Myslf », qui n'existe pas. Meme piege avec « LVERS » chez Louis
 * Vuitton.
 *
 *   tout en minuscules  — « party love », « ombre nomade » : personne ne
 *     stylise un parfum ainsi, c'est une majuscule oubliee. On met en forme.
 *
 *   TOUT EN CAPITALES   — ambigu. Soit on a crie, soit c'est la stylisation de
 *     la maison. On ne met en forme QUE si le mot porte une apostrophe ou un
 *     trait d'union, ou s'il y a plusieurs mots : « L'INTERDIT » et « OMBRE
 *     NOMADE » sont du francais crie, « MYSLF » est un logo.
 *
 * Le cout des deux erreurs n'est pas le meme. Laisser « OMBRE NOMADE » en
 * capitales se voit et se corrige ; transformer « MYSLF » en « Myslf » invente
 * un nom qui n'existe pas, et plus personne ne saura d'ou il vient.
 */
function fautMettreEnForme(valeur: string): boolean {
  if (porteUneCasse(valeur)) return false;

  const lettres = valeur.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  if (lettres === "") return false;

  const toutEnBas = lettres === lettres.toLowerCase();
  if (toutEnBas) return true;

  // Capitales : plusieurs mots, une apostrophe ou un trait d'union.
  return /\s/.test(valeur) || /['’-]/.test(valeur);
}

/** Espaces multiples réduits à un seul, espaces de bord retirés. */
function espacesPropres(valeur: string): string {
  return valeur.replace(/\s+/g, " ").trim();
}

function majusculeInitiale(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1);
}

/**
 * Met un mot en casse de titre, en respectant ses coupures internes.
 *
 * Le trait d'union sépare deux mots à part entière — « Attrape-Rêves »,
 * « Marc-Antoine » — donc chaque moitié prend sa majuscule.
 *
 * L'apostrophe, elle, ne se traite pas de la même façon des deux côtés. Après
 * un article élidé d'une seule lettre — l', d' — le mot suivant est un nom
 * propre et prend sa majuscule : « L'Interdit », « L'Immensité », « D'Orsay ».
 * Ailleurs on ne touche à rien, ce qui laisse « J'adore » tel que Dior
 * l'écrit — et non « J'Adore », qui n'existe pas.
 */
function casseDuMot(mot: string): string {
  if (mot === "") return mot;
  if (/\d/.test(mot)) return mot; // « 212 », « L.12.12 », « DGVIB3 » : intouchables
  if (SIGLES.has(mot.toUpperCase())) return mot.toUpperCase();

  if (mot.includes("-")) {
    return mot.split("-").map(casseDuMot).join("-");
  }

  const bas = mot.toLowerCase();
  const apostrophe = /^([a-zà-ÿ])['’](.+)$/.exec(bas);
  if (apostrophe) {
    const article = apostrophe[1] ?? "";
    const reste = apostrophe[2] ?? "";
    const separateur = mot.includes("’") ? "’" : "'";
    const suite = article === "l" || article === "d" ? majusculeInitiale(reste) : reste;
    return `${article.toUpperCase()}${separateur}${suite}`;
  }

  return majusculeInitiale(bas);
}

/**
 * Casse de titre à la française.
 *
 * N'agit que sur une saisie sans casse (tout bas ou tout haut). Une saisie
 * mixte est rendue telle quelle, aux espaces près.
 */
export function casseNomPropre(valeur: string): string {
  const propre = espacesPropres(valeur);
  if (!fautMettreEnForme(propre)) return propre;

  const mots = propre.split(" ");
  return mots
    .map((mot, index) => {
      if (mot === "&") return mot;
      const bas = mot.toLowerCase();
      // Un mot-outil garde sa minuscule, sauf en première ou dernière place :
      // « The One », « Nuit de Feu », mais aussi « Because It's You ».
      if (index > 0 && index < mots.length - 1 && MOTS_OUTILS.has(bas) && !/\d/.test(mot)) {
        return bas;
      }
      return casseDuMot(mot);
    })
    .join(" ");
}

/** Nom de marque prêt à enregistrer. */
export function normaliseMarque(valeur: string): string {
  return casseNomPropre(valeur);
}

/** Nom de parfum prêt à enregistrer. */
export function normaliseParfum(valeur: string): string {
  return casseNomPropre(valeur);
}

/**
 * Retrouve une entrée existante quelle que soit la façon dont on l'a tapée.
 *
 * C'est le vrai correcteur orthographique du catalogue, et il vaut mieux que
 * toutes les règles de casse ci-dessus : quand la marque existe déjà, on
 * reprend SON orthographe, celle qu'un humain a validée, plutôt que d'en
 * fabriquer une. Les règles ne servent qu'aux noms réellement nouveaux.
 */
export function trouveParNom<T>(
  entrees: readonly T[],
  nomDe: (entree: T) => string,
  saisie: string,
): T | undefined {
  const cle = cleNom(saisie);
  if (cle === "") return undefined;
  return entrees.find((entree) => cleNom(nomDe(entree)) === cle);
}

import { normalizeForFuzzy } from "../../data";

/** Une marque du référentiel : une ligne commerciale (Emporio Armani ≠ Giorgio Armani). */
export interface ReferenceBrand {
  brand: string;
  /** Variantes tapées par les clients, sans accents ni casse (« paco rabanne », « ysl »). */
  aliases?: string[];
  perfumes: string[];
}

export type ReferenceMatch =
  | { kind: "perfume"; name: string; brand: string }
  | { kind: "brand"; brand: string };

/**
 * Mots qu'un client ajoute sans qu'ils désignent un parfum : on les tolère absents du nom.
 * Concentrations et mots-outils seulement — « intense », « homme », « elixir » restent des noms.
 */
const MOTS_LIBRES = new Set([
  "parfum", "parfums", "perfume", "fragrance", "eau", "de", "du", "des", "d", "la", "le", "les", "l",
  "the", "of", "di", "pour", "for", "edp", "edt", "edc", "extrait", "toilette", "cologne",
]);

/** En deçà (« N°5 », « Y », « Man »), un nom ne se retrouve que tapé exactement. */
const LONGUEUR_NOM_FLOU = 4;
const SCORE_MIN = 65;

interface IndexedPerfume {
  name: string;
  compact: string;
  tokens: string[];
}

interface IndexedBrand {
  brand: string;
  /** Nom et alias, en clé compacte (« emporioarmani », « ysl »). */
  compacts: string[];
  /** Chaque écriture de la marque, découpée en mots. */
  spellings: string[][];
  perfumes: IndexedPerfume[];
}

const indexCache = new WeakMap<readonly ReferenceBrand[], IndexedBrand[]>();

function tokens(s: string): string[] {
  return normalizeForFuzzy(s).split(" ").filter(Boolean);
}

function compact(s: string): string {
  return normalizeForFuzzy(s).replace(/ /g, "");
}

function indexOf(data: readonly ReferenceBrand[]): IndexedBrand[] {
  let index = indexCache.get(data);
  if (!index) {
    index = data.map((b) => {
      const spellings = [b.brand, ...(b.aliases ?? [])].map(tokens).filter((t) => t.length > 0);
      return {
        brand: b.brand,
        compacts: spellings.map((t) => t.join("")),
        spellings,
        perfumes: b.perfumes
          .map((name) => ({ name, compact: compact(name), tokens: tokens(name) }))
          .filter((p) => p.compact.length > 0),
      };
    });
    indexCache.set(data, index);
  }
  return index;
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * Ressemblance d'un mot tapé à un mot de référence, de 0 à 1. Exact ; début de mot pour le dernier
 * mot (frappe en cours) ; une faute à partir de 5 lettres, deux à partir de 8, jamais sur la
 * première lettre (« celine » ne retrouve pas « Féline »). Un mot court doit être exact. Une note
 * sous `TYPO` signale une faute de frappe.
 */
const TYPO = 0.86;

function wordScore(typed: string, word: string, last: boolean): number {
  if (typed === word) return 1;
  if (last && typed.length >= 3 && word.startsWith(typed)) return 0.9;
  if (typed.length >= 5 && typed[0] === word[0]) {
    const d = levenshtein(typed, word);
    if (d <= 1) return 0.85;
    if (d <= 2 && typed.length >= 8) return 0.8;
  }
  return 0;
}

/** Meilleur mot libre de `pool` pour `typed` ; consomme le mot retenu. */
function take(typed: string, pool: string[], last: boolean): number {
  let best = -1;
  let bestScore = 0;
  pool.forEach((word, i) => {
    const s = wordScore(typed, word, last);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  });
  if (best >= 0) pool.splice(best, 1);
  return bestScore;
}

interface Scored {
  score: number;
  /** Au moins un mot retrouvé au prix d'une faute de frappe. */
  typo: boolean;
}

interface PerfumeHit extends Scored {
  name: string;
  brand: string;
  nameLength: number;
}

/**
 * Score d'un parfum : TOUS les mots tapés doivent se retrouver dans le nom ou la marque (hors mots
 * libres), dont au moins un dans le nom. On classe ensuite par part du nom couverte : « stronger
 * with you » préfère « Stronger With You » à « Stronger With You Intensely ».
 */
function scorePerfume(typed: string[], brand: IndexedBrand, perfume: IndexedPerfume): Scored {
  let best: Scored = { score: 0, typo: false };
  if (perfume.compact.length < LONGUEUR_NOM_FLOU) return best;
  for (const spelling of brand.spellings) {
    const namePool = [...perfume.tokens];
    const brandPool = [...spelling];
    let nameHits = 0;
    let longNameHit = false;
    let total = 0;
    let typo = false;
    let ok = true;
    typed.forEach((t, i) => {
      if (!ok) return;
      const last = i === typed.length - 1;
      const inName = take(t, namePool, last);
      if (inName > 0) {
        nameHits++;
        longNameHit ||= t.length >= 2;
        total += inName;
        typo ||= inName < TYPO;
        return;
      }
      const inBrand = take(t, brandPool, last);
      if (inBrand > 0) {
        total += inBrand;
        typo ||= inBrand < TYPO;
      } else if (!MOTS_LIBRES.has(t)) ok = false;
    });
    if (!ok || nameHits === 0 || !longNameHit) continue;
    const cover = (perfume.tokens.length - namePool.length) / perfume.tokens.length;
    const score = 55 + 30 * cover + 10 * (total / typed.length);
    if (isBetter({ score, typo }, best)) best = { score, typo };
  }
  return best;
}

/** Sans faute de frappe passe avant avec faute ; puis le score. */
function isBetter(a: Scored, b: Scored): boolean {
  if (b.score === 0) return a.score > 0;
  if (a.typo !== b.typo) return !a.typo;
  return a.score > b.score;
}

/** Score d'une marque seule : tous les mots tapés dans une écriture de la marque, hors mots libres. */
function scoreBrand(typed: string[], brand: IndexedBrand): { score: number; fullyNamed: boolean } {
  let best = { score: 0, fullyNamed: false };
  for (const spelling of brand.spellings) {
    const pool = [...spelling];
    let matched = 0;
    let unmatched = 0;
    typed.forEach((t, i) => {
      if (take(t, pool, i === typed.length - 1) > 0) matched++;
      else if (!MOTS_LIBRES.has(t)) unmatched++;
    });
    if (matched === 0) continue;
    const fullyNamed = pool.length === 0;
    // Marque nommée en entier : sûr (95). Marque entière + mots inconnus (« zara rich warm ») : on
    // parle de la marque (66). Marque en partie (« emporio ») : probable, mais un parfum qui contient
    // le mot passe devant (« code » → Armani Code, pas la marque).
    const score = unmatched === 0 ? (fullyNamed ? 95 : 60 + 15 * (matched / spelling.length)) : fullyNamed ? 66 : 0;
    if (score > best.score) best = { score, fullyNamed };
  }
  return best;
}

/**
 * La référence du référentiel la plus proche de la saisie, ou null.
 *
 * Le référentiel recense des parfums qui ne sont PAS au catalogue : il ne sert qu'à reconnaître ce
 * que le client cherche pour l'inviter à nous écrire. Mieux vaut ne rien reconnaître que reconnaître
 * à tort : un « Vous recherchez Splendida de Bvlgari ? » à qui tape « j'adore » fait fuir.
 */
export function searchReference(
  data: readonly ReferenceBrand[],
  query: string,
): ReferenceMatch | null {
  const typed = tokens(query);
  const typedCompact = typed.join("");
  if (typedCompact.length < 3) return null;

  let perfume: PerfumeHit | null = null;
  let brand: { score: number; brand: string } | null = null;

  for (const entry of indexOf(data)) {
    // Marque tapée d'un bloc : « emporio armani », « ysl ».
    const exactBrand = entry.compacts.includes(typedCompact);
    if (exactBrand && (brand?.score ?? 0) < 100) brand = { score: 100, brand: entry.brand };

    const b = exactBrand ? null : scoreBrand(typed, entry);
    if (b && b.score > (brand?.score ?? 0)) brand = { score: b.score, brand: entry.brand };

    for (const p of entry.perfumes) {
      // Écrit d'un bloc, marque avant ou après : « jadore », « dior jadore », « jadore dior ».
      const exact =
        p.compact === typedCompact ||
        entry.compacts.some((c) => c + p.compact === typedCompact || p.compact + c === typedCompact);
      const hit = exact ? { score: 100, typo: false } : scorePerfume(typed, entry, p);
      if (hit.score < SCORE_MIN) continue;
      const better =
        !perfume ||
        isBetter(hit, perfume) ||
        (hit.score === perfume.score && hit.typo === perfume.typo && p.tokens.length < perfume.nameLength);
      if (better) perfume = { ...hit, name: p.name, brand: entry.brand, nameLength: p.tokens.length };
    }
  }

  // Un parfum qui porte exactement le nom tapé passe avant tout (« Chloé », « Jimmy Choo ») ;
  // sinon une marque nommée en entier passe avant un parfum qui la contient (« chanel »).
  if (perfume && perfume.score === 100) return { kind: "perfume", name: perfume.name, brand: perfume.brand };
  if (brand && brand.score === 100) return { kind: "brand", brand: brand.brand };
  if (perfume && (perfume.score >= (brand?.score ?? 0) || (brand && brand.score < 95 && !perfume.typo))) {
    return { kind: "perfume", name: perfume.name, brand: perfume.brand };
  }
  if (brand && brand.score >= SCORE_MIN) return { kind: "brand", brand: brand.brand };
  return null;
}

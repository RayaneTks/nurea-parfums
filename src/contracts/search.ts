/**
 * Recherche de la gestion (04 §3.5, §15 règle 10 ; 06 §4.4 S17, E10 zone 3, S06).
 *
 * Deux usages, une seule écriture des règles de saisie :
 * - la recherche à la frappe (`GET /api/admin/search?q=&scope=`) : clients, documents, parfums, filtrés sur des
 *   instantanés en mémoire du serveur ;
 * - la recherche ÉTENDUE de la liste Commandes (E10), exécutée en SQL sur toute la vue (repliés compris).
 *
 * Règles communes (reprises de `src/server/search/filters.ts` de la production, 07 §3.0.3) : plusieurs mots =
 * TOUS doivent correspondre, chacun dans n'importe quel champ ; insensible à la casse et aux accents (dans les
 * deux sens : « elysee » trouve « Élysée », « élysée » trouve « Elysee ») ; mots d'une lettre ignorés ; 6 mots au
 * plus. Un numéro se cherche comme on l'écrit en France : « 06 12 » trouve « +33 6 12… ».
 */
import type { DocumentOrigin, DocumentStatus } from "@/domain/document-status";
import type { MoneyString } from "@/domain/money";
import type { PublicationStatus } from "@/domain/publication";
import type { StockStatus } from "@/domain/stock";
import type { ReceivableDTO } from "./chiffres";
import type { PocketSummary } from "./treasury";

export const SEARCH_SCOPES = ["all", "customers", "documents", "perfumes"] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

/** Dès 2 caractères (06 §4.4). */
export const SEARCH_MIN_LENGTH = 2;
/** Mots d'une lettre ignorés, 6 mots au plus (E10 zone 3). */
export const SEARCH_MIN_TERM = 2;
export const SEARCH_MAX_TERMS = 6;
/** Groupes de 6 résultats au plus, « Voir les N résultats » au-delà. */
export const SEARCH_GROUP_LIMIT = 6;
/** S06 : « Récents », 8 clients triés par dernier document. */
export const RECENT_CUSTOMERS_LIMIT = 8;
/** Une saisie plus longue est une faute de collage, pas une recherche. */
export const SEARCH_MAX_LENGTH = 120;

/**
 * Forme pliée d'un texte pour la comparaison : minuscules, sans diacritiques, ligatures dépliées. Jumelle de
 * l'expression SQL `foldSql` de `src/server/search/fold.ts` (mêmes lettres, même résultat).
 */
export function foldText(text: string): string {
  return text
    .replace(/[œŒ]/g, "oe")
    .replace(/[æÆ]/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Mots exploitables d'une saisie : pliés, d'au moins 2 caractères, distincts, 6 au plus. */
export function searchTerms(q: string | null | undefined): string[] {
  if (!q) return [];
  const words = foldText(q.slice(0, SEARCH_MAX_LENGTH))
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= SEARCH_MIN_TERM);
  return [...new Set(words)].slice(0, SEARCH_MAX_TERMS);
}

/**
 * Une saisie qui n'est qu'un numéro (« 06 12 », « +33 6 12 34 », « 0033 6… ») : ses chiffres, écrits des deux
 * façons qu'on trouve en base — nationale (« 0612 », contact libre saisi à la main) et internationale sans « + »
 * (« 33612 », E.164 d'une fiche). `null` si la saisie contient autre chose que des chiffres et des séparateurs.
 */
export function phoneDigitVariants(q: string | null | undefined): string[] | null {
  if (!q) return null;
  const text = q.trim();
  if (!/^[+\d][\d\s.\-/()+]*$/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  if (digits.length < SEARCH_MIN_TERM) return null;
  const variants = new Set<string>([digits]);
  if (digits.startsWith("00")) variants.add(digits.slice(2));
  else if (digits.startsWith("0") && digits.length > 1) variants.add(`33${digits.slice(1)}`);
  if (digits.startsWith("33") && digits.length > 2) variants.add(`0${digits.slice(2)}`);
  return [...variants];
}

// ── Route de lecture ───────────────────────────────────────────────────────────

export type SearchParams = { q: string; scope: SearchScope };

/** `?q=&scope=` → paramètres : saisie rognée et plafonnée, portée inconnue = « all ». */
export function parseSearchParams(params: { get(name: string): string | null }): SearchParams {
  const q = (params.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const raw = params.get("scope");
  const scope = (SEARCH_SCOPES as readonly string[]).includes(raw ?? "") ? (raw as SearchScope) : "all";
  return { q, scope };
}

export type CustomerHitDTO = {
  id: string;
  fullName: string;
  /** « 06 12 34 56 78 », « @fares.b », ou null. */
  contact: string | null;
  /** À encaisser de la fiche (`aEncaisserParClient`), null s'il est nul. */
  due: MoneyString | null;
  /**
   * Action de résultat « Encaisser xx € » (S17, amendement A16) : les créances de la fiche, les plus
   * anciennes d'abord — exactement celles de l'écran À encaisser (`aEncaisserDetail`), filtrées sur elle.
   * Vide quand le client ne doit rien, et dans toute portée autre que `all` (aucune action de résultat n'y
   * est rendue). Portées ici plutôt que par une sixième route (04 §3.5, liste fermée) : la palette ouvre
   * S02 SANS aller-retour, donc sans attente au tap (06 §4.4).
   */
  receivables: readonly ReceivableDTO[];
};

export type DocumentHitDTO = {
  id: string;
  origin: DocumentOrigin;
  status: DocumentStatus;
  /** ISO 8601. */
  orderedAt: string;
  /** Nom vivant de la fiche, à défaut le nom saisi ; null pour un client de passage sans nom. */
  customerName: string | null;
  total: MoneyString;
  /** Dû d'un document engagé (confirmé ou livré) ; null sinon (06 §1.7 : « À encaisser » ou « Total »). */
  due: MoneyString | null;
};

export type PerfumeHitDTO = {
  id: number;
  name: string;
  brandName: string;
  image: string;
  status: PublicationStatus;
  stockStatus: StockStatus;
};

/** Un groupe de résultats : les 6 premiers et le nombre total (« Voir les 14 résultats »). */
export type SearchGroupDTO<T> = { total: number; items: T[] };

export type SearchResultsDTO = {
  q: string;
  customers: SearchGroupDTO<CustomerHitDTO>;
  documents: SearchGroupDTO<DocumentHitDTO>;
  perfumes: SearchGroupDTO<PerfumeHitDTO>;
  /**
   * Saisie vide, portée `customers` : les 8 clients au document le plus récent (S06 « Récents ») ; vide sinon.
   */
  recentCustomers: CustomerHitDTO[];
  /**
   * Poches actives du moment (ordre choisi, « Non attribué » en dernier), pour la sheet S02 qu'ouvre
   * « Encaisser xx € ». Lues SEULEMENT quand un résultat client porte une créance : une frappe qui ne
   * trouve personne à encaisser ne paie pas la lecture des soldes.
   */
  pockets: readonly PocketSummary[];
};

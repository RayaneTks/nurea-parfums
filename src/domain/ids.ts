/**
 * Identifiants : génération côté client et types marqués.
 *
 * Les créations sensibles au double envoi (document, paiement, dépense) reçoivent leur id du
 * formulaire, généré à son ouverture et gardé jusqu'au succès (04 §3.6) : un double tap ou un
 * « Réessayer » après coupure renvoie le même id, et le writer rejoue au lieu de dupliquer.
 *
 * Les marques de type empêchent de passer un `CustomerId` là où on attend un `DocumentId` ;
 * à l'exécution ce sont des chaînes (ou un entier pour `PerfumeId`). Les parseurs servent
 * aux frontières (paramètre d'URL, entrée d'action) ; une valeur rejetée est une erreur de
 * programmation ou une URL fabriquée — le contrat zod l'aura normalement arrêtée avant.
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type DocumentId = Brand<string, "DocumentId">;
export type SaleLineId = Brand<string, "SaleLineId">;
export type PaymentId = Brand<string, "PaymentId">;
export type CustomerId = Brand<string, "CustomerId">;
export type BrandId = Brand<string, "BrandId">;
export type PerfumeId = Brand<number, "PerfumeId">;
export type BatchId = Brand<string, "BatchId">;
export type BatchExpenseId = Brand<string, "BatchExpenseId">;
export type PocketId = Brand<string, "PocketId">;
export type CashMovementId = Brand<string, "CashMovementId">;
export type AdminUserId = Brand<string, "AdminUserId">;

/**
 * UUID v4 d'une création idempotente. `globalThis.crypto` et non `node:crypto` : le même code
 * tourne dans le formulaire (iOS Safari ≥ 15.4, contexte sécurisé) et sur le serveur.
 */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}

// cuid v1 de Prisma (`@default(cuid())`, créations serveur et reprise) ou UUID en minuscules
// (créations client). Majuscules refusées : deux graphies d'un même UUID seraient deux lignes.
const CUID = /^c[a-z0-9]{24}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isTextId(value: unknown): value is string {
  return typeof value === "string" && (CUID.test(value) || UUID.test(value));
}

type TextIdParser<T extends string> = {
  /** Lève sur une valeur qui n'a pas la forme d'un identifiant. */
  parse(value: string): T;
  /** `null` plutôt qu'une exception : paramètre d'URL (`?doc=…`) qui mène à « n'existe plus ». */
  safeParse(value: unknown): T | null;
  /** Sans contrôle, pour une valeur relue en base. */
  parseUnsafe(value: string): T;
};

function textId<T extends string>(kind: string): TextIdParser<T> {
  return {
    parse(value) {
      if (!isTextId(value)) throw new TypeError(`${kind} : « ${String(value)} » n'est pas un identifiant`);
      return value as T;
    },
    safeParse: (value) => (isTextId(value) ? (value as T) : null),
    parseUnsafe: (value) => value as T,
  };
}

export const DocumentId = textId<DocumentId>("DocumentId");
export const SaleLineId = textId<SaleLineId>("SaleLineId");
export const PaymentId = textId<PaymentId>("PaymentId");
export const CustomerId = textId<CustomerId>("CustomerId");
export const BrandId = textId<BrandId>("BrandId");
export const BatchId = textId<BatchId>("BatchId");
export const BatchExpenseId = textId<BatchExpenseId>("BatchExpenseId");
export const PocketId = textId<PocketId>("PocketId");
export const CashMovementId = textId<CashMovementId>("CashMovementId");
export const AdminUserId = textId<AdminUserId>("AdminUserId");

// Séquence PostgreSQL `int4` lue par la vitrine.
const PERFUME_ID_MAX = 2_147_483_647;

function toPerfumeId(value: number | string): PerfumeId | null {
  const n = typeof value === "number" ? value : /^[1-9]\d{0,9}$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(n) && n > 0 && n <= PERFUME_ID_MAX ? (n as PerfumeId) : null;
}

export const PerfumeId = {
  parse(value: number | string): PerfumeId {
    const id = toPerfumeId(value);
    if (id === null) throw new TypeError(`PerfumeId : entier positif attendu, reçu « ${value} »`);
    return id;
  },
  safeParse(value: unknown): PerfumeId | null {
    return typeof value === "number" || typeof value === "string" ? toPerfumeId(value) : null;
  },
  parseUnsafe: (value: number): PerfumeId => value as PerfumeId,
};

/**
 * Branded ID types. Prevent accidental mixing of OrderId / CustomerId / PerfumeId at the type level.
 * Runtime is unchanged (string or number). Use the parsers at boundaries (API input, DB output).
 */

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type OrderId = Brand<string, "OrderId">;
export type CustomerId = Brand<string, "CustomerId">;
export type BrandId = Brand<string, "BrandId">;
export type PerfumeId = Brand<number, "PerfumeId">;
export type SaleId = Brand<string, "SaleId">;
export type PaymentId = Brand<string, "PaymentId">;
export type AdminUserId = Brand<string, "AdminUserId">;

const CUID_RE = /^c[a-z0-9]{24}$/i;

function assertCuidLike(value: string, kind: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${kind}: expected non-empty string, got ${typeof value}`);
  }
  if (!CUID_RE.test(value)) {
    throw new Error(`${kind}: ${value} is not a valid cuid`);
  }
}

export const OrderId = {
  parse: (v: string): OrderId => {
    assertCuidLike(v, "OrderId");
    return v as OrderId;
  },
  parseUnsafe: (v: string): OrderId => v as OrderId,
};

export const CustomerId = {
  parse: (v: string): CustomerId => {
    assertCuidLike(v, "CustomerId");
    return v as CustomerId;
  },
  parseUnsafe: (v: string): CustomerId => v as CustomerId,
};

export const BrandId = {
  parse: (v: string): BrandId => {
    assertCuidLike(v, "BrandId");
    return v as BrandId;
  },
  parseUnsafe: (v: string): BrandId => v as BrandId,
};

export const SaleId = {
  parse: (v: string): SaleId => {
    assertCuidLike(v, "SaleId");
    return v as SaleId;
  },
  parseUnsafe: (v: string): SaleId => v as SaleId,
};

export const PaymentId = {
  parse: (v: string): PaymentId => {
    assertCuidLike(v, "PaymentId");
    return v as PaymentId;
  },
  parseUnsafe: (v: string): PaymentId => v as PaymentId,
};

export const AdminUserId = {
  parse: (v: string): AdminUserId => {
    assertCuidLike(v, "AdminUserId");
    return v as AdminUserId;
  },
  parseUnsafe: (v: string): AdminUserId => v as AdminUserId,
};

export const PerfumeId = {
  parse: (v: number | string): PerfumeId => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`PerfumeId: expected positive integer, got ${v}`);
    }
    return n as PerfumeId;
  },
  parseUnsafe: (v: number): PerfumeId => v as PerfumeId,
};

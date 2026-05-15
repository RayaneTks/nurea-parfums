import { z } from "zod";
import { volumeMlSchema } from "./order";

const moneyEur = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).replace(",", "."))
  .refine((s) => /^\d+(\.\d{1,2})?$/.test(s), "Prix invalide.");

const moneyDzd = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    return String(v).replace(",", ".");
  })
  .refine((s) => s === null || /^\d+(\.\d{1,2})?$/.test(s), "Coût DZD invalide.");

const exchangeRate = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    return String(v).replace(",", ".");
  })
  .refine(
    (s) => s === null || /^\d+(\.\d{1,4})?$/.test(s),
    "Taux de change invalide.",
  );

export const perfumePricingUpsertSchema = z.object({
  perfumeId: z.number().int().positive(),
  volumeMl: volumeMlSchema,
  defaultUnitPriceEur: moneyEur,
  defaultUnitCostDzd: moneyDzd,
  defaultExchangeRate: exchangeRate,
});

export const perfumePricingLookupSchema = z.object({
  perfumeId: z.number().int().positive(),
  volumeMl: volumeMlSchema,
});

export type PerfumePricingUpsert = z.infer<typeof perfumePricingUpsertSchema>;
export type PerfumePricingLookup = z.infer<typeof perfumePricingLookupSchema>;

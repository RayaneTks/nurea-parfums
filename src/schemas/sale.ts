import { z } from "zod";
import { volumeMlSchema } from "./order";

const moneyOptional = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return "0";
    return String(v).replace(",", ".");
  })
  .refine((s) => /^-?\d+(\.\d{1,2})?$/.test(s), "Montant invalide.");

const moneyRequired = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).replace(",", "."))
  .refine((s) => /^-?\d+(\.\d{1,2})?$/.test(s), "Montant invalide.");

export const saleItemInputSchema = z.object({
  /** Si null → ligne off-catalog. Snapshot obligatoire. */
  perfumeId: z.number().int().positive().nullable(),
  perfumeSnapshot: z
    .object({
      name: z.string().min(1),
      brandName: z.string().min(1),
      image: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  quantity: z.number().int().min(1).max(999),
  volumeMl: volumeMlSchema.nullable().optional(),
  unitPrice: moneyRequired,
  unitCostDzd: moneyOptional,
  exchangeRate: moneyOptional,
}).refine(
  (it) => it.perfumeId !== null || (it.perfumeSnapshot && it.perfumeSnapshot.name.length > 0),
  { message: "Parfum requis (catalogue ou snapshot).", path: ["perfumeId"] },
);

export const createSaleInputSchema = z.object({
  orderId: z.string().min(1).nullable().optional(),
  customerId: z.string().min(1).nullable().optional(),
  customerName: z.string().trim().max(120).nullable().optional(),
  soldAt: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(saleItemInputSchema).min(1, "Au moins une ligne."),
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

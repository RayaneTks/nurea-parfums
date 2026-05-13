import { z } from "zod";

export const paymentTypeSchema = z.enum(["DEPOSIT", "BALANCE", "REFUND"]);
export type PaymentTypeValue = z.infer<typeof paymentTypeSchema>;

const moneyString = z
  .string()
  .trim()
  .regex(/^-?\d+([.,]\d{1,2})?$/, "Montant invalide (ex: 12,50).")
  .transform((s) => s.replace(",", "."));

export const paymentCreateSchema = z.object({
  orderId: z.string().min(1),
  type: paymentTypeSchema,
  amount: moneyString,
  paidAt: z.coerce.date().optional(),
  method: z.string().trim().max(50).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const paymentVoidSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().max(500).nullable().optional(),
});

export type PaymentCreate = z.infer<typeof paymentCreateSchema>;
export type PaymentVoid = z.infer<typeof paymentVoidSchema>;

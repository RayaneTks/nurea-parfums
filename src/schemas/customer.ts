import { z } from "zod";

const fullName = z
  .string()
  .trim()
  .min(2, "Nom requis (minimum 2 caractères).")
  .max(120);

const phone = z
  .string()
  .trim()
  .regex(/^\+\d{8,15}$/, "Numéro au format E.164 (+33612345678).")
  .nullable()
  .optional();

const snapchat = z.string().trim().min(2).max(40).nullable().optional();

const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => (v === "" ? null : v ?? null));

export const customerCreateSchema = z.object({
  fullName,
  phoneE164: phone.transform((v) => (v === "" ? null : v ?? null)),
  snapchat: snapchat.transform((v) => (v === "" ? null : v ?? null)),
  whatsappE164: phone.transform((v) => (v === "" ? null : v ?? null)),
  address: optionalText(500),
  notes: optionalText(2000),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CustomerCreate = z.infer<typeof customerCreateSchema>;
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>;
export type CustomerSearch = z.infer<typeof customerSearchSchema>;

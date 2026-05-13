import { z } from "zod";

const fullName = z
  .string()
  .trim()
  .min(2, "Nom requis (minimum 2 caractères).")
  .max(120);

// Phone & snap: empty string treated as null FIRST, then regex applied to non-empty.
const phone = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const t = v.trim();
    return t === "" ? null : t;
  })
  .refine(
    (v) => v === null || /^\+\d{8,15}$/.test(v),
    "Numéro au format E.164 (+33612345678).",
  );

const snapchat = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const t = v.trim();
    return t === "" ? null : t;
  })
  .refine((v) => v === null || (v.length >= 2 && v.length <= 40), "Snap entre 2 et 40 caractères.");

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const t = v.trim();
      return t === "" ? null : t;
    })
    .refine((v) => v === null || v.length <= max, `Trop long (max ${max}).`);

export const customerCreateSchema = z.object({
  fullName,
  phoneE164: phone,
  snapchat,
  whatsappE164: phone,
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

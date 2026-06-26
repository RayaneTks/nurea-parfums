import { z } from "zod";

export const orderStatusSchema = z.enum(["PENDING", "READY", "DELIVERED", "CANCELLED"]);
export type OrderStatusValue = z.infer<typeof orderStatusSchema>;

export const VOLUMES_ML = [30, 50, 100] as const;
export const volumeMlSchema = z.union([z.literal(30), z.literal(50), z.literal(100)]);

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

export const orderItemInputSchema = z.object({
  /// null = parfum hors-catalogue, snapshot obligatoire dans ce cas.
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
  volumeMl: volumeMlSchema,
  unitPrice: moneyRequired,
  unitCostDzd: moneyOptional,
  exchangeRate: moneyOptional,
  note: z.string().trim().max(500).nullable().optional(),
  /// Don : parfum offert (prix 0, coût compté en perte).
  isGift: z.boolean().optional().default(false),
}).refine(
  (item) => item.perfumeId !== null || (item.perfumeSnapshot && item.perfumeSnapshot.name.length > 0),
  { message: "Parfum requis (ID catalogue ou snapshot off-catalog).", path: ["perfumeId"] },
);

const createOrderBaseSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  customerName: z.string().trim().min(2, "Nom du client requis.").max(120),
  deliveryAt: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  items: z.array(orderItemInputSchema).min(1, "Ajoute au moins une ligne."),
  /// Acompte enregistré à la création (optionnel). Si fourni > 0, crée
  /// automatiquement une PaymentTransaction(DEPOSIT) et passe en READY.
  initialDeposit: z
    .object({
      amount: moneyRequired,
      method: z.string().trim().max(50).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const createOrderInputSchema = createOrderBaseSchema.refine(
  (o) => !o.initialDeposit || Number(o.initialDeposit.amount) > 0,
  { message: "Montant d'acompte doit être > 0.", path: ["initialDeposit", "amount"] },
);

export const updateOrderInputSchema = createOrderBaseSchema
  .omit({ initialDeposit: true })
  .partial()
  .extend({ status: orderStatusSchema.optional() });

export const orderListFilterSchema = z.object({
  status: orderStatusSchema.optional(),
  customerId: z.string().min(1).optional(),
  depositPaid: z.coerce.boolean().optional(),
  includeDelivered: z.coerce.boolean().default(false),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type OrderListFilter = z.infer<typeof orderListFilterSchema>;

"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { perfumePricingUpsertSchema } from "@/schemas/perfume-pricing";
import type { ActionResult } from "@/server/customers/actions";

export async function upsertPerfumePricingAction(
  input: unknown,
): Promise<ActionResult<{ perfumeId: number; volumeMl: number }>> {
  const parsed = perfumePricingUpsertSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Saisie invalide." };
  }
  const { perfumeId, volumeMl, defaultUnitPriceEur, defaultUnitCostDzd, defaultExchangeRate } =
    parsed.data;

  try {
    await prisma.perfumePricing.upsert({
      where: { perfumeId_volumeMl: { perfumeId, volumeMl } },
      update: {
        defaultUnitPriceEur,
        defaultUnitCostDzd: defaultUnitCostDzd ?? null,
        defaultExchangeRate: defaultExchangeRate ?? null,
      },
      create: {
        perfumeId,
        volumeMl,
        defaultUnitPriceEur,
        defaultUnitCostDzd: defaultUnitCostDzd ?? null,
        defaultExchangeRate: defaultExchangeRate ?? null,
      },
    });
    await writeAudit(undefined, "perfume-pricing.upsert", "PerfumePricing", `${perfumeId}_${volumeMl}`);
    revalidatePath(`/admin/perfumes/${perfumeId}/edit`);
    return { ok: true, data: { perfumeId, volumeMl } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sauvegarde impossible." };
  }
}

export async function deletePerfumePricingAction(
  perfumeId: number,
  volumeMl: number,
): Promise<ActionResult<{ perfumeId: number; volumeMl: number }>> {
  try {
    await prisma.perfumePricing.delete({
      where: { perfumeId_volumeMl: { perfumeId, volumeMl } },
    });
    await writeAudit(undefined, "perfume-pricing.delete", "PerfumePricing", `${perfumeId}_${volumeMl}`);
    revalidatePath(`/admin/perfumes/${perfumeId}/edit`);
    return { ok: true, data: { perfumeId, volumeMl } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import Decimal from "decimal.js-light";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/admin/audit";
import { tagFor } from "@/lib/admin/cache-tags";
import { recordMovement } from "@/server/treasury/movements";
import { recordPaymentAction } from "@/server/orders/paymentActions";
import type { ActionResult } from "@/server/customers/actions";
import type { OutstandingKind } from "./queries";

export type CollectInput = {
  kind: OutstandingKind;
  id: string;
  /** Montant encaissé, en euros. */
  amount: string;
  /** Poche créditée. `null` → « Non attribué », à répartir plus tard. */
  pocketId?: string | null;
  method?: string | null;
};

/**
 * Encaisse une créance, quelle que soit son origine.
 *
 * Un seul point d'entrée pour les deux modèles de dette de l'app :
 *
 * - **commande** → délègue à `recordPaymentAction` (type `BALANCE`), qui gère
 *   déjà l'historique des paiements, la transition de statut et la trésorerie ;
 * - **vente** → décrémente `Sale.remainingDue` ET crédite une poche. C'est le
 *   second point qui manquait : l'ancien écran laissait corriger le reste dû à
 *   la main sans jamais enregistrer l'entrée d'argent, si bien que la
 *   trésorerie ne bougeait pas.
 *
 * Le montant est plafonné au reste dû : encaisser plus que dû produirait un
 * solde négatif, invisible et faux dans tous les totaux.
 */
export async function collectAction(input: CollectInput): Promise<ActionResult<{ due: string }>> {
  const raw = Number(String(input.amount).replace(",", ".").trim());
  if (!Number.isFinite(raw) || raw <= 0) {
    return { ok: false, error: "Le montant doit être supérieur à 0." };
  }
  const amount = new Decimal(raw);

  if (input.kind === "order") {
    const result = await recordPaymentAction({
      orderId: input.id,
      type: "BALANCE",
      amount: amount.toFixed(2),
      method: input.method ?? null,
      pocketId: input.pocketId ?? null,
    });
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath("/admin/encaisser");
    return { ok: true, data: { due: "0.00" } };
  }

  const sale = await prisma.sale.findUnique({
    where: { id: input.id },
    select: { id: true, customerName: true, remainingDue: true },
  });
  if (!sale) return { ok: false, error: "Vente introuvable." };

  const due = new Decimal(sale.remainingDue.toString());
  if (due.lessThanOrEqualTo(0)) {
    return { ok: false, error: "Cette vente est déjà soldée." };
  }
  if (amount.greaterThan(due)) {
    return {
      ok: false,
      error: `Montant supérieur au reste dû (${due.toFixed(2)} €).`,
    };
  }

  const nextDue = due.minus(amount);

  try {
    await prisma.sale.update({
      where: { id: sale.id },
      data: { remainingDue: nextDue.toFixed(2) },
    });

    await recordMovement({
      pocketId: input.pocketId ?? null,
      amount: amount.toFixed(2),
      kind: "BALANCE_IN",
      label: `Solde vente${sale.customerName ? ` · ${sale.customerName}` : ""}`,
      refType: "Sale",
      refId: sale.id,
    });

    await writeAudit(undefined, "sale.collect", "Sale", sale.id, {
      amount: amount.toFixed(2),
      remainingDue: nextDue.toFixed(2),
    });

    revalidatePath("/admin/encaisser");
    revalidatePath("/admin/compta");
    revalidatePath("/admin");
    revalidateTag(tagFor.sales(), "default");
    revalidateTag(tagFor.sale(sale.id), "default");
    revalidateTag(tagFor.kpi(), "default");
    revalidateTag(tagFor.treasury(), "default");
    revalidateTag(tagFor.batches(), "default");

    return { ok: true, data: { due: nextDue.toFixed(2) } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Encaissement impossible.",
    };
  }
}

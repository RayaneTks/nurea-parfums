"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { customerCreateSchema, customerUpdateSchema } from "@/schemas/customer";
import type { CustomerCreate, CustomerUpdate } from "@/schemas/customer";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function createCustomerAction(input: CustomerCreate): Promise<ActionResult<{ id: string; fullName: string }>> {
  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Saisie invalide." };
  }
  const data = parsed.data;

  try {
    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        phoneE164: data.phoneE164 ?? null,
        snapchat: data.snapchat ?? null,
        whatsappE164: data.whatsappE164 ?? null,
        address: data.address ?? null,
        notes: data.notes ?? null,
      },
      select: { id: true, fullName: true },
    });
    await writeAudit(undefined, "customer.create", "Customer", customer.id);
    revalidatePath("/admin/clients");
    return { ok: true, data: customer };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Création impossible.";
    if (message.includes("Unique constraint") && message.includes("phoneE164")) {
      return { ok: false, error: "Un client a déjà ce numéro de téléphone." };
    }
    return { ok: false, error: message };
  }
}

export async function updateCustomerAction(id: string, input: CustomerUpdate): Promise<ActionResult<{ id: string }>> {
  const parsed = customerUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Saisie invalide." };
  }

  try {
    await prisma.customer.update({
      where: { id },
      data: parsed.data,
    });
    await writeAudit(undefined, "customer.update", "Customer", id);
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true, data: { id } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Mise à jour impossible.";
    return { ok: false, error: message };
  }
}

export async function deleteCustomerAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    // Garde : refuse si commandes actives liées.
    const active = await prisma.order.count({
      where: { customerId: id, status: { in: ["PENDING", "READY"] } },
    });
    if (active > 0) {
      return {
        ok: false,
        error: `Impossible : ${active} commande(s) active(s) liée(s). Termine-les ou détache-les d'abord.`,
      };
    }
    await prisma.customer.delete({ where: { id } });
    await writeAudit(undefined, "customer.delete", "Customer", id);
    revalidatePath("/admin/clients");
    return { ok: true, data: { id } };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Suppression impossible.";
    return { ok: false, error: message };
  }
}

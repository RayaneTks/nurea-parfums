import { prisma } from "@/lib/db/prisma";

export async function writeAudit(
  actorId: string | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ? (meta as object) : undefined,
      },
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError, NeedsConfirmation } from "@/domain/errors";
import { resetDatabase } from "./support/database";
import { useTestDatabaseForServer } from "./support/server";

/**
 * Traduction des erreurs de base (04 §9.3) sur les erreurs RÉELLES de Prisma 6.19 et PostgreSQL :
 * leur forme (code, meta, texte) n'est pas documentée partout, elle est donc éprouvée ici.
 */

vi.mock("server-only", () => ({}));

type Server = typeof import("@/server/core/errors") & typeof import("@/server/db/transaction") & typeof import("@/lib/db/prisma");

let server: Server;

beforeAll(async () => {
  await useTestDatabaseForServer();
  server = {
    ...(await import("@/server/core/errors")),
    ...(await import("@/server/db/transaction")),
    ...(await import("@/lib/db/prisma")),
  };
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(server.prisma);
});

const failure = (work: Promise<unknown>) => work.then(() => expect.unreachable("l'écriture aurait dû échouer"), (e: unknown) => e);

describe("toActionError sur de vraies erreurs de base (04 §9.3)", () => {
  it("unicité du téléphone : CONFLICT avec le message du dictionnaire", async () => {
    await server.prisma.customer.create({ data: { fullName: "Inès", phoneE164: "+33612345678" } });
    const error = await failure(server.prisma.customer.create({ data: { fullName: "Autre", phoneE164: "+33612345678" } }));
    expect(server.describeDbError(error)).toMatchObject({ prismaCode: "P2002", modelName: "Customer", target: ["phoneE164"] });
    expect(server.toActionError(error)).toMatchObject({
      code: "CONFLICT",
      message: "Ce numéro est déjà celui d'une autre fiche client : ouvre-la plutôt que d'en créer une.",
    });
  });

  it("clé primaire en double : reconnue comme rejeu d'idempotence", async () => {
    await server.prisma.batch.create({ data: { id: "b-1", name: "Mars" } });
    const error = await failure(server.prisma.batch.create({ data: { id: "b-1", name: "Mars" } }));
    expect(server.isIdempotentReplayConflict(error)).toBe(true);
  });

  it("CHECK violé : CONFLICT avec le texte du domaine, contrainte lue dans le message", async () => {
    const brand = await server.prisma.brand.create({ data: { name: "Dior", slug: "dior" } });
    const error = await failure(
      server.prisma.perfume.create({ data: { brandId: brand.id, name: "Sauvage", image: "  ", status: "PUBLISHED" } }),
    );
    expect(server.describeDbError(error)).toMatchObject({ sqlstate: "23514", constraint: "perfume_publish_image_ck" });
    expect(server.toActionError(error)).toMatchObject({ code: "CONFLICT", message: "Ajoute un visuel pour publier ce parfum." });
  });

  it("suppression bloquée par Restrict : CONFLICT ; clé étrangère vers une ligne absente : NOT_FOUND", async () => {
    const pocket = await server.prisma.pocket.create({ data: { name: "Espèces" } });
    await server.prisma.cashMovement.create({ data: { pocketId: pocket.id, amount: "10.00", kind: "ADJUSTMENT" } });
    const restricted = await failure(server.prisma.pocket.delete({ where: { id: pocket.id } }));
    expect(server.toActionError(restricted)).toMatchObject({
      code: "CONFLICT",
      message: "Cette poche a un historique : archive-la une fois son solde à 0.",
    });

    const orphan = await failure(
      server.prisma.saleDocument.create({ data: { origin: "ORDER", customerId: "client-disparu" } }),
    );
    expect(server.toActionError(orphan)).toMatchObject({
      code: "NOT_FOUND",
      message: "Cette fiche client n'existe plus. Elle a peut-être été supprimée depuis un autre écran.",
    });
  });

  it("enregistrement absent (P2025) : NOT_FOUND par entité", async () => {
    const error = await failure(server.prisma.batch.update({ where: { id: "absent" }, data: { name: "x" } }));
    expect(server.toActionError(error)).toMatchObject({
      code: "NOT_FOUND",
      message: "Ce lot n'existe plus. Il a peut-être été supprimé depuis un autre écran.",
    });
  });

  it("trigger différé au COMMIT (mouvement PAYMENT sans paiement) : UNEXPECTED avec référence, rien d'écrit", async () => {
    const pocket = await server.prisma.pocket.create({ data: { name: "Espèces" } });
    const error = await failure(
      server.inTransaction((tx) => tx.db.cashMovement.create({ data: { pocketId: pocket.id, amount: "10.00", kind: "PAYMENT" } })),
    );
    expect(server.isNureaTriggerError(error)).toBe(true);
    const translated = server.toActionError(error);
    expect(translated).toMatchObject({ code: "UNEXPECTED", retryable: false });
    expect(translated.reference).toMatch(/^[0-9A-F]{4}$/);
    expect(translated.message).toContain(`(réf. ${translated.reference})`);
    expect(translated.message).not.toMatch(/Nuréa :|PAYMENT|Prisma/);
    expect(await server.prisma.cashMovement.count()).toBe(0);
  });

  it("erreurs du domaine et de session : codes et champs conservés", () => {
    expect(server.toActionError(new DomainError("VALIDATION", "Indique un prix.", "lines.0.unitPriceEur"))).toEqual({
      code: "VALIDATION",
      message: "Indique un prix.",
      fields: { "lines.0.unitPriceEur": "Indique un prix." },
      retryable: false,
    });
    expect(server.toActionError(new NeedsConfirmation("Livrer ?", ["Il reste 40,00 € à encaisser."], "Livrer"))).toMatchObject({
      code: "NEEDS_CONFIRMATION",
      confirm: { title: "Livrer ?", reserves: ["Il reste 40,00 € à encaisser."], confirmLabel: "Livrer" },
    });
    expect(server.toActionError(new server.SessionExpired())).toMatchObject({ code: "SESSION_EXPIRED" });
    expect(server.toActionError(new TypeError("x is undefined"))).toMatchObject({ code: "UNEXPECTED" });
  });
});

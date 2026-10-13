import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { freshStart, loadServer, type Server } from "./transactions/support/harness";
import { memoryCookies } from "./support/server";

const cookieJar = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: () => {}, revalidateTag: () => {}, revalidatePath: () => {}, unstable_cache: (fn: () => unknown) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));

const fixture = {
  brandName: "Maison de test",
  perfumeName: "Parfum test",
  sourceType: "BRAND_OFFICIAL" as const,
  sourceUrl: "https://brand.example/perfume",
  rightsEvidence: "Autorisation écrite de réutilisation, dossier LIC-42.",
  retrievedAt: "2026-10-13T10:00:00.000Z",
  topNotes: ["Bergamote"],
  heartNotes: ["Jasmin"],
  baseNotes: ["Cèdre"],
  universeCorrection: "Univers frais et boisé.",
};

let server: Server;
let actions: typeof import("@/server/perfume-research/actions");
let route: typeof import("../../app/api/admin/perfume-research/route");

beforeAll(async () => {
  server = await loadServer();
  actions = await import("@/server/perfume-research/actions");
  route = await import("../../app/api/admin/perfume-research/route");
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  await server.prisma.adminUser.create({
    data: { id: "u-test", username: "gerant-test", passwordHash: "test-only" },
  });
});

describe("base privée de recherche parfum", () => {
  it("requiert une session pour l'API et l'import", async () => {
    cookieJar.current = memoryCookies().store;
    const response = await route.GET(new NextRequest("http://localhost/api/admin/perfume-research?brand=Maison&perfume=Parfum"));
    expect(response.status).toBe(401);
    const result = await actions.stagePerfumeResearchAction({ records: [fixture] });
    expect(result).toMatchObject({ ok: false, error: { code: "SESSION_EXPIRED" } });
  });

  it("staging JSON rejouable, puis approbation auditée et lecture réservée au validé", async () => {
    const first = await actions.stagePerfumeResearchAction({ records: [fixture] });
    expect(first).toMatchObject({ ok: true, data: { staged: 1, duplicates: 0 } });
    const duplicate = await actions.stagePerfumeResearchAction({ records: [fixture] });
    expect(duplicate).toMatchObject({ ok: true, data: { staged: 0, duplicates: 1 } });

    const pending = await server.prisma.perfumeResearchRecord.findFirstOrThrow();
    expect(pending).toMatchObject({ status: "PENDING", reviewerId: null, topNotes: ["Bergamote"] });
    const before = await route.GET(new NextRequest("http://localhost/api/admin/perfume-research?brand=Maison%20de%20test&perfume=Parfum%20test"));
    expect(await before.json()).toMatchObject({ ok: true, data: [] });
    const pendingRoute = await route.GET(
      new NextRequest("http://localhost/api/admin/perfume-research?brand=Maison%20de%20test&perfume=Parfum%20test&status=PENDING"),
    );
    expect(await pendingRoute.json()).toMatchObject({ ok: true, data: [{ status: "PENDING", rightsConfirmed: false }] });

    expect(
      await actions.reviewPerfumeResearchAction({ id: pending.id, status: "VERIFIED", rightsConfirmed: false }),
    ).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    const reviewed = await actions.reviewPerfumeResearchAction({ id: pending.id, status: "VERIFIED", rightsConfirmed: true });
    expect(reviewed).toMatchObject({
      ok: true,
      data: { status: "VERIFIED", rightsConfirmed: true, reviewerId: "u-test", reviewedAt: expect.any(Date) },
    });
    const after = await route.GET(new NextRequest("http://localhost/api/admin/perfume-research?brand=Maison%20de%20test&perfume=Parfum%20test"));
    expect(await after.json()).toMatchObject({
      ok: true,
      data: [{ sourceUrl: fixture.sourceUrl, topNotes: fixture.topNotes, reviewerId: "u-test" }],
    });
    expect((await actions.reviewPerfumeResearchAction({ id: pending.id, status: "REJECTED", rightsConfirmed: false })).ok).toBe(false);
  });

  it("refuse toute URL Fragrantica à l'entrée", async () => {
    const result = await actions.stagePerfumeResearchAction({
      records: [{ ...fixture, sourceUrl: "https://www.fragrantica.com/perfume/test" }],
    });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
    expect(await server.prisma.perfumeResearchRecord.count()).toBe(0);
  });

  it("la contrainte SQL bloque les domaines interdits même si un import contourne le contrat", async () => {
    for (const sourceUrl of [
      "https://www.fragrantica.com/perfume/test",
      "https://www.fragrantica.fr/parfum/test",
      "https://cdn.fimgs.net/perfume/test.jpg",
      "https://fraguru.com/perfume/test.jpg",
    ]) {
      await expect(
        server.prisma.perfumeResearchRecord.create({
          data: {
            brandName: fixture.brandName,
            perfumeName: fixture.perfumeName,
            brandKey: "maisondetest",
            perfumeKey: "parfumtest",
            sourceType: "BRAND_OFFICIAL",
            sourceUrl,
            rightsEvidence: fixture.rightsEvidence,
            retrievedAt: new Date(fixture.retrievedAt),
          },
        }),
      ).rejects.toThrow();
    }
    expect(await server.prisma.perfumeResearchRecord.count()).toBe(0);
  });
});

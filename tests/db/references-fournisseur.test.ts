import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OWNED, freshStart, loadCatalogueServer, type CatalogueServer } from "./support/catalogue";

/**
 * Ajout des références du fournisseur (`scripts/catalogue/ajouter-references.ts`) contre la base de test.
 *
 * La promesse : seules des fiches NOUVELLES sont écrites (masquées, sans visuel), rien d'existant ne
 * bouge, un second passage n'ajoute rien, et l'annulation retire exactement ce que le journal liste —
 * jamais une fiche modifiée depuis ni une marque qui garde des parfums.
 */

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet-essai-j11.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-de-service-fictive";
  process.env.SUPABASE_STORAGE_BUCKET = "catalog";
});
const cookieJar = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: () => undefined,
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));
vi.mock("@supabase/supabase-js", async () => (await import("./support/catalogue")).fakeSupabaseModule());

let server: CatalogueServer;
let script: typeof import("../../scripts/catalogue/ajouter-references");

beforeAll(async () => {
  server = await loadCatalogueServer();
  script = await import("../../scripts/catalogue/ajouter-references");
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
});

const REFERENCES = [
  { brand: "Lattafa", name: "Asad" },
  { brand: "Lattafa", name: "Khamrah" },
  { brand: "Rasasi", name: "Hawas" },
];

async function planDepuisBase() {
  const { marques, parfums } = await script.lireCatalogue(server.prisma);
  return script.planifier(REFERENCES, marques, parfums);
}

async function amorce() {
  const brand = await server.prisma.brand.create({ data: { name: "Lattafa", slug: "lattafa", status: "DRAFT" } });
  const asad = await server.prisma.perfume.create({
    data: { brandId: brand.id, name: "Asad", image: `${OWNED}perfumes/1757500000001-00000001.webp`, status: "PUBLISHED" },
  });
  return { brand, asad };
}

describe("appliquer", () => {
  it("n'ajoute que le manquant, en brouillon et sans visuel, et ne touche pas l'existant", async () => {
    const { asad } = await amorce();
    const avant = await server.prisma.perfume.findUniqueOrThrow({ where: { id: asad.id } });

    const plan = await planDepuisBase();
    expect(plan.dejaPresentes).toHaveLength(1);
    expect(plan.aInserer).toHaveLength(2);

    const journal = await script.appliquer(plan, "hote-test", null);
    expect(journal.parfums).toHaveLength(2);
    expect(journal.marques.map((m) => m.name)).toEqual(["Rasasi"]);

    const ajoutes = await server.prisma.perfume.findMany({ where: { id: { in: journal.parfums.map((p) => p.id) } } });
    expect(ajoutes.every((p) => p.status === "DRAFT" && p.image === "")).toBe(true);
    expect(await server.prisma.perfume.count()).toBe(3);

    const apres = await server.prisma.perfume.findUniqueOrThrow({ where: { id: asad.id } });
    expect(apres).toEqual(avant);
  });

  it("est rejouable : un second passage n'a plus rien à ajouter", async () => {
    await amorce();
    await script.appliquer(await planDepuisBase(), "hote-test", null);
    const second = await planDepuisBase();
    expect(second.aInserer).toHaveLength(0);
    expect(second.dejaPresentes).toHaveLength(3);
  });
});

describe("annuler", () => {
  it("retire exactement les lignes du journal, marque créée comprise, et laisse l'existant", async () => {
    const { asad } = await amorce();
    const journal = await script.appliquer(await planDepuisBase(), "hote-test", null);

    const essai = await script.annuler(journal, false);
    expect(essai.supprimes).toBe(2);
    expect(await server.prisma.perfume.count()).toBe(3);

    const bilan = await script.annuler(journal, true);
    expect(bilan).toEqual({ supprimes: 2, gardes: [] });
    expect(await server.prisma.perfume.count()).toBe(1);
    expect(await server.prisma.perfume.findUnique({ where: { id: asad.id } })).not.toBeNull();
    expect(await server.prisma.brand.findFirst({ where: { name: "Rasasi" } })).toBeNull();
    expect(await server.prisma.brand.findFirst({ where: { name: "Lattafa" } })).not.toBeNull();
  });

  it("garde une fiche modifiée depuis l'ajout, et la marque qui l'abrite", async () => {
    await amorce();
    const journal = await script.appliquer(await planDepuisBase(), "hote-test", null);
    const hawas = journal.parfums.find((p) => p.name === "Hawas");
    expect(hawas).toBeDefined();
    await server.prisma.perfume.update({
      where: { id: hawas!.id },
      data: { image: `${OWNED}perfumes/1757500000002-00000002.webp`, status: "PUBLISHED" },
    });

    const bilan = await script.annuler(journal, true);
    expect(bilan.supprimes).toBe(1);
    expect(bilan.gardes.join("\n")).toMatch(/Hawas.*modifiée/);
    expect(bilan.gardes.join("\n")).toMatch(/marque Rasasi : conservée/);
    expect(await server.prisma.perfume.findUnique({ where: { id: hawas!.id } })).not.toBeNull();
    expect(await server.prisma.brand.findFirst({ where: { name: "Rasasi" } })).not.toBeNull();
  });
});

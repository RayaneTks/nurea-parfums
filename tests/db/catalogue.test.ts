import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPerfumeInput, updatePerfumeInput, type UpdatePerfumeInput } from "@/contracts/catalogue";
import { canFeaturePerfume, canPublishBrand, canPublishPerfume } from "@/domain/publication";
import {
  FOREIGN,
  INJECTED,
  OWNED,
  catalogueImage,
  expectError,
  expectOk,
  failingAfterWrite,
  freshStart,
  loadCatalogueServer,
  stamp,
  storageFake,
  storyPath,
  type CatalogueServer,
} from "./support/catalogue";

/**
 * Catalogue (07 J11 ; 04 §3.4, §10, §12 ; 03 §4.2, §4.3 T14, §4.4) : fiche parfum et grille en une
 * transaction, slug de marque stable, règles et messages de `publication.ts`, mise en avant limitée,
 * cascades de suppression avec historique lisible, objets du bucket retirés après le commit, invalidation.
 */

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet-essai-j11.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-de-service-fictive";
  process.env.SUPABASE_STORAGE_BUCKET = "catalog";
});
const cache = vi.hoisted(() => ({ calls: [] as string[] }));
const cookieJar = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  updateTag: (tag: string) => void cache.calls.push(`updateTag:${tag}`),
  revalidateTag: (tag: string) => void cache.calls.push(`revalidateTag:${tag}`),
  revalidatePath: (path: string) => void cache.calls.push(`revalidatePath:${path}`),
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));
vi.mock("@supabase/supabase-js", async () => (await import("./support/catalogue")).fakeSupabaseModule());

let server: CatalogueServer;

beforeAll(async () => {
  server = await loadCatalogueServer();
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  cache.calls.length = 0;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

/** `revalidateAdminCatalogue()` et les tags d'une écriture du catalogue (04 §10.2, §12). */
const CATALOGUE_INVALIDATION = [
  "updateTag:gestion",
  "updateTag:admin-catalogue",
  "revalidateTag:public-catalogue",
  "revalidateTag:admin-catalogue",
  "revalidatePath:/admin/catalogue",
  "revalidatePath:/",
];

/** Visuels story seuls : la gestion, jamais la vitrine (04 §10.1). */
const MEDIA_INVALIDATION = ["updateTag:gestion", "updateTag:admin-catalogue"];

async function brand(name: string, fields: { catalogMode?: "CURATED" | "COMPLETE"; status?: "DRAFT" | "PUBLISHED"; image?: string } = {}) {
  return expectOk(await server.actions.createBrandAction({ name, ...fields }));
}

async function perfume(brandId: string, name: string, fields: { image?: string; imageLight?: string | null } = {}) {
  return expectOk(
    await server.actions.createPerfumeAction({
      brand: { kind: "existing", brandId },
      name,
      image: fields.image ?? catalogueImage(),
      imageLight: fields.imageLight,
    }),
  );
}

const row = (id: number) => server.prisma.perfume.findUniqueOrThrow({ where: { id } });
const pricingOf = (perfumeId: number) =>
  server.prisma.perfumePricing.findMany({ where: { perfumeId }, orderBy: { volumeMl: "asc" } });

// ── Fiche et grille (A-6) ──────────────────────────────────────────────────────

describe("parfum et grille tarifaire en un enregistrement (A-6)", () => {
  it("création : fiche et grille ensemble ; marque saisie rattachée à l'équivalente, avec une notice", async () => {
    const vuitton = await brand("Louis Vuitton");
    const result = await server.actions.createPerfumeAction({
      brand: { kind: "new", name: "louis vuitton" },
      name: "ombre nomade",
      image: catalogueImage(),
      pricing: [
        { volumeMl: 80, unitPriceEur: "250", unitCostDzd: "60 000", exchangeRate: "277" },
        { volumeMl: 10, unitPriceEur: "45,50" },
      ],
    });
    const created = expectOk(result);
    expect(result.ok && result.notice).toBe("Rattaché à Louis Vuitton, déjà au catalogue.");
    expect(created).toMatchObject({ brandId: vuitton.id, name: "Ombre Nomade", status: "PUBLISHED", isFeatured: false });
    expect(await server.prisma.brand.count()).toBe(1);
    expect((await row(created.id)).stock).toBeNull(); // un parfum créé est « Non suivi »
    expect(
      (await pricingOf(created.id)).map((p) => [p.volumeMl, p.defaultUnitPriceEur.toString(), p.defaultUnitCostDzd?.toString() ?? null, p.defaultExchangeRate?.toString() ?? null]),
    ).toEqual([
      [10, "45.5", null, null],
      [80, "250", "60000", "277"],
    ]);
  });

  it("atomicité de la création : une erreur après la marque ou le parfum n'en laisse rien", async () => {
    const input = createPerfumeInput.parse({
      brand: { kind: "new", name: "Guerlain" },
      name: "Shalimar",
      image: catalogueImage(),
      pricing: [{ volumeMl: 50, unitPriceEur: "90" }],
    });
    for (const nth of [1, 2, 3]) {
      await expect(server.inTransaction((tx) => server.writer.createPerfume(failingAfterWrite(tx, nth), input))).rejects.toThrow(
        INJECTED,
      );
      expect([await server.prisma.brand.count(), await server.prisma.perfume.count(), await server.prisma.perfumePricing.count()]).toEqual([
        0, 0, 0,
      ]);
    }
  });

  it("modification : fiche et grille en un envoi, volume absent retiré, coût vidé effacé ; le stock n'est jamais touché", async () => {
    const dior = await brand("Dior");
    const sauvage = expectOk(
      await server.actions.createPerfumeAction({
        brand: { kind: "existing", brandId: dior.id },
        name: "Sauvage",
        image: catalogueImage(),
        pricing: [
          { volumeMl: 50, unitPriceEur: "90" },
          { volumeMl: 80, unitPriceEur: "120", unitCostDzd: "30000", exchangeRate: "277" },
        ],
      }),
    );
    expectOk(await server.actions.setPerfumeStockAction({ id: sauvage.id, stock: 5 }));

    // Un écran périmé qui enverrait encore un stock : la clé est ignorée (01 §4.5).
    const stale = { id: sauvage.id, name: "sauvage elixir", pricing: [
      { volumeMl: 80, unitPriceEur: "130", unitCostDzd: "", exchangeRate: "277" },
      { volumeMl: 10, unitPriceEur: "25" },
    ], stock: 0 } as UpdatePerfumeInput;
    expect(updatePerfumeInput.parse(stale)).not.toHaveProperty("stock");
    const updated = expectOk(await server.actions.updatePerfumeAction(stale));

    expect(updated.name).toBe("Sauvage Elixir");
    expect((await row(sauvage.id)).stock).toBe(5);
    expect((await pricingOf(sauvage.id)).map((p) => [p.volumeMl, p.defaultUnitPriceEur.toString(), p.defaultUnitCostDzd])).toEqual([
      [10, "25", null],
      [80, "130", null],
    ]);
  });

  it("un enregistrement sans modification n'écrit rien (aucune invalidation)", async () => {
    const dior = await brand("Dior");
    const sauvage = expectOk(
      await server.actions.createPerfumeAction({
        brand: { kind: "existing", brandId: dior.id },
        name: "Sauvage",
        pricing: [{ volumeMl: 80, unitPriceEur: "120", exchangeRate: "277" }],
      }),
    );
    cache.calls.length = 0;
    expectOk(
      await server.actions.updatePerfumeAction({
        id: sauvage.id,
        name: "Sauvage",
        image: "",
        pricing: [{ volumeMl: 80, unitPriceEur: "120,00", exchangeRate: "277.0" }],
      }),
    );
    expect(cache.calls).toEqual([]);
  });

  it("atomicité de la modification : une erreur dans la grille laisse la fiche intacte", async () => {
    const dior = await brand("Dior");
    const sauvage = expectOk(
      await server.actions.createPerfumeAction({
        brand: { kind: "existing", brandId: dior.id },
        name: "Sauvage",
        image: catalogueImage(),
        pricing: [{ volumeMl: 50, unitPriceEur: "90" }],
      }),
    );
    const input = updatePerfumeInput.parse({ id: sauvage.id, name: "Bleu", pricing: [{ volumeMl: 80, unitPriceEur: "120" }] });
    // Écritures : perfume.update, perfumePricing.deleteMany, perfumePricing.upsert.
    await expect(server.inTransaction((tx) => server.writer.updatePerfume(failingAfterWrite(tx, 3), input))).rejects.toThrow(INJECTED);
    expect((await row(sauvage.id)).name).toBe("Sauvage");
    expect((await pricingOf(sauvage.id)).map((p) => p.volumeMl)).toEqual([50]);
  });

  it("un nom équivalent dans la même marque est refusé en nommant le parfum existant", async () => {
    const dior = await brand("Dior");
    await perfume(dior.id, "J'adore");
    expect(
      expectError(await server.actions.createPerfumeAction({ brand: { kind: "existing", brandId: dior.id }, name: "jadore" }), "CONFLICT")
        .message,
    ).toBe("Dior a déjà un parfum nommé J'adore.");
  });
});

// ── Marques ────────────────────────────────────────────────────────────────────

describe("marques : slug stable et dédoublonnage (04 §12, 02 §4.5)", () => {
  it("renommer ne change jamais le slug ; une marque créée ensuite sous l'ancien nom prend un suffixe", async () => {
    const dior = await brand("Dior");
    expect(dior.slug).toBe("dior");
    const renamed = expectOk(await server.actions.updateBrandAction({ id: dior.id, name: "christian dior" }));
    expect(renamed.brand).toMatchObject({ name: "Christian Dior", slug: "dior" });
    expect((await server.prisma.brand.findUniqueOrThrow({ where: { id: dior.id } })).slug).toBe("dior");

    const other = await brand("Dior");
    expect(other).toMatchObject({ name: "Dior", slug: "dior-2" });
  });

  it("« louis vuitton » sélectionne « Louis Vuitton » avec une notice, jamais une erreur ; renommer vers un équivalent est refusé", async () => {
    const vuitton = await brand("Louis Vuitton");
    const again = await server.actions.createBrandAction({ name: "louis vuitton" });
    expect(again).toEqual({
      ok: true,
      data: { id: vuitton.id, name: "Louis Vuitton", slug: "louis-vuitton", catalogMode: "CURATED", status: "PUBLISHED" },
      notice: "Louis Vuitton existe déjà au catalogue : elle a été sélectionnée.",
    });
    const guerlain = await brand("Guerlain");
    expect(expectError(await server.actions.updateBrandAction({ id: guerlain.id, name: "LOUIS-VUITTON" }), "CONFLICT").message).toBe(
      "La marque Louis Vuitton porte déjà ce nom : ouvre-la plutôt que d'en renommer une autre.",
    );
  });

  it("gamme complète visible sans logo : refusée avec le message du domaine", async () => {
    const message = (canPublishBrand({ catalogMode: "COMPLETE", image: null }) as { message: string }).message;
    expect(expectError(await server.actions.createBrandAction({ name: "Lattafa", catalogMode: "COMPLETE" }), "CONFLICT").message).toBe(message);
    expect(await server.prisma.brand.count()).toBe(0);
    const hidden = await brand("Lattafa", { catalogMode: "COMPLETE", status: "DRAFT" });
    expect(expectError(await server.actions.setBrandVisibilityAction({ id: hidden.id, status: "PUBLISHED" }), "CONFLICT").message).toBe(message);
  });
});

// ── Publication ────────────────────────────────────────────────────────────────

describe("publication : règles et messages uniques de publication.ts (04 §12)", () => {
  it("sans visuel : créé masqué avec une notice ; publication refusée avec « Ajoute un visuel… », rien d'écrit", async () => {
    const dior = await brand("Dior");
    const created = await server.actions.createPerfumeAction({ brand: { kind: "existing", brandId: dior.id }, name: "Sauvage" });
    const sauvage = expectOk(created);
    expect(sauvage.status).toBe("DRAFT");
    expect(created.ok && created.notice).toBe("Sauvage ajouté, masqué : ajoute un visuel pour publier ce parfum.");

    const before = await row(sauvage.id);
    const refused = expectError(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "PUBLISHED" }), "CONFLICT");
    expect(refused.message).toBe("Ajoute un visuel pour publier ce parfum.");
    expect(refused.message).toBe((canPublishPerfume({ image: "" }, { ...dior, image: null }) as { message: string }).message);
    expect((await row(sauvage.id)).updatedAt).toEqual(before.updatedAt);
  });

  it("marque masquée, marque en gamme complète : refus avec le texte du domaine", async () => {
    const dior = await brand("Dior", { status: "DRAFT" });
    const sauvage = await perfume(dior.id, "Sauvage");
    expect(sauvage.status).toBe("DRAFT");
    expect(expectError(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "PUBLISHED" }), "CONFLICT").message).toBe(
      "Rends d'abord la marque Dior visible.",
    );
    const guerlain = await brand("Guerlain", { catalogMode: "COMPLETE", image: `${OWNED}brands/${stamp()}.webp` });
    const shalimar = await perfume(guerlain.id, "Shalimar");
    expect(expectError(await server.actions.setPerfumeStatusAction({ id: shalimar.id, status: "PUBLISHED" }), "CONFLICT").message).toBe(
      "La marque Guerlain est en gamme complète : repasse-la en Sélection pour publier ce parfum.",
    );
  });

  it("retirer le visuel d'un parfum visible et en avant : masqué, sans mise en avant, et la notice le dit", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: sauvage.id, featured: true }));
    const result = await server.actions.updatePerfumeAction({ id: sauvage.id, image: "" });
    expect(expectOk(result)).toMatchObject({ status: "DRAFT", isFeatured: false });
    expect(result.ok && result.notice).toBe("Sauvage masqué : ajoute un visuel pour publier ce parfum.");
  });

  it("masquer puis republier en 1 tap : idempotent", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    expect(expectOk(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "DRAFT" })).status).toBe("DRAFT");
    cache.calls.length = 0;
    expectOk(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "DRAFT" }));
    expect(cache.calls).toEqual([]);
    expect(expectOk(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "PUBLISHED" })).status).toBe("PUBLISHED");
  });
});

describe("mise en avant : deux emplacements, parfum visible exigé (02 §4.5)", () => {
  it("troisième ⇒ CONFLICT « Les 2 emplacements sont pris… » ; parfum masqué ⇒ CONFLICT ; masquer libère l'emplacement", async () => {
    const dior = await brand("Dior");
    const [a, b, c] = [await perfume(dior.id, "Sauvage"), await perfume(dior.id, "Fahrenheit"), await perfume(dior.id, "Dune")];
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: a.id, featured: true }));
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: b.id, featured: true }));
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: b.id, featured: true })); // déjà en avant : sans effet

    const third = expectError(await server.actions.setPerfumeFeaturedAction({ id: c.id, featured: true }), "CONFLICT");
    expect(third.message).toBe("Les 2 emplacements sont pris : retire d'abord un parfum.");
    expect(third.message).toBe((canFeaturePerfume({ status: "PUBLISHED" }, 2) as { message: string }).message);

    const hidden = await perfume(dior.id, "Poison", { image: "" });
    expect(expectError(await server.actions.setPerfumeFeaturedAction({ id: hidden.id, featured: true }), "CONFLICT").message).toBe(
      "Rends d'abord ce parfum visible pour le mettre en avant.",
    );

    expectOk(await server.actions.setPerfumeStatusAction({ id: a.id, status: "DRAFT" }));
    expect((await row(a.id)).isFeatured).toBe(false);
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: c.id, featured: true }));
    expect(await server.prisma.perfume.count({ where: { isFeatured: true } })).toBe(2);
  });

  it("quatre mises en avant simultanées : exactement deux réussissent", async () => {
    const dior = await brand("Dior");
    const perfumes = [];
    for (const name of ["Sauvage", "Fahrenheit", "Dune", "Hypnotic"]) perfumes.push(await perfume(dior.id, name));
    const results = await Promise.all(perfumes.map((p) => server.actions.setPerfumeFeaturedAction({ id: p.id, featured: true })));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    expect(results.filter((r) => !r.ok && r.error.code === "CONFLICT")).toHaveLength(2);
    expect(await server.prisma.perfume.count({ where: { isFeatured: true } })).toBe(2);
  });
});

// ── T14 ────────────────────────────────────────────────────────────────────────

describe("T14 : masquer une marque ou la passer en gamme complète (03 §4.3)", () => {
  it("réserve à confirmer ; confirmée, ses parfums sont masqués et perdent la mise en avant ; republier ceux qui ont un visuel", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    await perfume(dior.id, "Fahrenheit");
    const poison = await perfume(dior.id, "Poison", { image: "" });
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: sauvage.id, featured: true }));

    const reserve = expectError(await server.actions.setBrandVisibilityAction({ id: dior.id, status: "DRAFT" }), "NEEDS_CONFIRMATION");
    expect(reserve.confirm).toEqual({
      title: "Masquer Dior ?",
      reserves: ["Ses 2 parfums seront masqués sur la vitrine."],
      confirmLabel: "Confirmer",
    });
    expect(await server.prisma.perfume.count({ where: { status: "PUBLISHED" } })).toBe(2);
    expect((await server.prisma.brand.findUniqueOrThrow({ where: { id: dior.id } })).status).toBe("PUBLISHED");

    const hidden = expectOk(await server.actions.setBrandVisibilityAction({ id: dior.id, status: "DRAFT", confirm: true }));
    expect(hidden).toMatchObject({ hiddenPerfumes: 2, republishable: 0, brand: { status: "DRAFT", slug: "dior" } });
    expect(await server.prisma.perfume.count({ where: { OR: [{ status: "PUBLISHED" }, { isFeatured: true }] } })).toBe(0);

    const visible = expectOk(await server.actions.setBrandVisibilityAction({ id: dior.id, status: "PUBLISHED" }));
    expect(visible).toMatchObject({ hiddenPerfumes: 0, republishable: 2 });
    expect(expectOk(await server.actions.republishBrandPerfumesAction({ id: dior.id }))).toEqual({ brandId: dior.id, republished: 2 });
    expect((await row(poison.id)).status).toBe("DRAFT");
    expect((await row(sauvage.id)).isFeatured).toBe(false);
  });

  it("passer en gamme complète : logo exigé, puis réserve « Passer Dior en gamme complète ? »", async () => {
    const dior = await brand("Dior");
    await perfume(dior.id, "Sauvage");
    expect(expectError(await server.actions.updateBrandAction({ id: dior.id, catalogMode: "COMPLETE" }), "CONFLICT").message).toBe(
      "Ajoute un logo pour publier une gamme complète.",
    );
    const logo = `${OWNED}brands/${stamp()}.webp`;
    expect(
      expectError(await server.actions.updateBrandAction({ id: dior.id, catalogMode: "COMPLETE", image: logo }), "NEEDS_CONFIRMATION")
        .confirm,
    ).toMatchObject({ title: "Passer Dior en gamme complète ?", reserves: ["Son parfum visible sera masqué sur la vitrine."] });
    expectOk(await server.actions.updateBrandAction({ id: dior.id, catalogMode: "COMPLETE", image: logo, confirm: true }));
    expect(await server.prisma.perfume.count({ where: { status: "PUBLISHED" } })).toBe(0);
    expect(
      expectError(await server.actions.republishBrandPerfumesAction({ id: dior.id }), "CONFLICT").message,
    ).toBe("La marque Dior est en gamme complète : repasse-la en Sélection pour publier ce parfum.");
  });

  it("un parfum ne peut pas être publié pendant que sa marque se masque (verrou de la marque)", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage", { image: "" });
    expectOk(await server.actions.updatePerfumeAction({ id: sauvage.id, image: catalogueImage() }));

    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    const hiding = server.inTransaction(async (tx) => {
      await server.writer.updateBrand(tx, { id: dior.id, status: "DRAFT", confirm: true });
      await released;
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const publishing = server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "PUBLISHED" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    release();
    await hiding;
    expect(expectError(await publishing, "CONFLICT").message).toBe("Rends d'abord la marque Dior visible.");
    expect((await row(sauvage.id)).status).toBe("DRAFT");
  });
});

// ── Suppressions ───────────────────────────────────────────────────────────────

async function saleWith(lines: { perfumeId: number; perfumeName: string; brandName: string; imageUrl: string }[]) {
  return server.prisma.saleDocument.create({
    data: {
      id: globalThis.crypto.randomUUID(),
      origin: "DIRECT_SALE",
      status: "DELIVERED",
      confirmedAt: new Date(),
      deliveredAt: new Date(),
      customerName: "Fares",
      lines: {
        create: lines.map((line, position) => ({
          ...line,
          position,
          volumeMl: 50,
          quantity: 1,
          deliveredQuantity: 1,
          unitPriceEur: "120.00",
        })),
      },
    },
    include: { lines: true },
  });
}

async function addStory(perfumeId: number) {
  return expectOk(
    await server.actions.addPerfumeMediaAction({ perfumeId, path: storyPath(perfumeId), width: 1080, height: 1920, bytes: 400_000 }),
  );
}

describe("suppressions : historique lisible, objets retirés après le commit (04 §12, 03 §4.4)", () => {
  it("supprimer une marque : parfums, tarifs et visuels en cascade ; lignes de documents lisibles ; seuls nos objets non référencés partent, après le commit", async () => {
    const logo = `${OWNED}brands/${stamp()}.webp`;
    const dior = await brand("Dior", { image: logo });
    const soldImage = catalogueImage();
    const sauvage = expectOk(
      await server.actions.createPerfumeAction({
        brand: { kind: "existing", brandId: dior.id },
        name: "Sauvage",
        image: soldImage,
        pricing: [{ volumeMl: 80, unitPriceEur: "120" }],
      }),
    );
    const bleuImage = catalogueImage();
    const bleu = await perfume(dior.id, "Bleu", { image: bleuImage, imageLight: `${FOREIGN}perfumes/bleu-clair.webp` });
    const stories = [await addStory(sauvage.id), await addStory(bleu.id)];
    const sale = await saleWith([
      { perfumeId: sauvage.id, perfumeName: "Sauvage", brandName: "Dior", imageUrl: soldImage },
      { perfumeId: bleu.id, perfumeName: "Bleu", brandName: "Dior", imageUrl: `${FOREIGN}perfumes/ancien.webp` },
    ]);

    const seenAtRemoval: number[] = [];
    storageFake.onRemove = async () => {
      // Une autre connexion voit déjà la suppression : l'objet part APRÈS le commit.
      seenAtRemoval.push(await server.prisma.brand.count({ where: { id: dior.id } }));
    };
    expect(expectOk(await server.actions.deleteBrandAction({ id: dior.id }))).toEqual({ id: dior.id, deleted: true, perfumes: 2 });
    expect(seenAtRemoval).toEqual([0]);

    const removed = storageFake.removed.flat().sort();
    expect(removed).toEqual(
      [logo, bleuImage, ...stories.map((s) => s.url)].map((url) => url.slice(OWNED.length)).sort(),
    );
    expect(removed).not.toContain(soldImage.slice(OWNED.length)); // vignette d'une vente passée
    expect(removed.some((path) => path.includes("bleu-clair"))).toBe(false); // objet d'un autre projet

    const lines = await server.prisma.saleLine.findMany({ where: { documentId: sale.id }, orderBy: { position: "asc" } });
    expect(lines.map((l) => [l.perfumeId, l.isOffCatalog, l.perfumeName, l.brandName, l.imageUrl])).toEqual([
      [null, false, "Sauvage", "Dior", soldImage],
      [null, false, "Bleu", "Dior", `${FOREIGN}perfumes/ancien.webp`],
    ]);
    expect([await server.prisma.perfume.count(), await server.prisma.perfumePricing.count()]).toEqual([0, 0]);
    expect(await server.prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM "PerfumeMedia"`).toEqual([{ n: 0 }]);

    storageFake.removed.length = 0;
    expect(expectOk(await server.actions.deleteBrandAction({ id: dior.id }))).toEqual({ id: dior.id, deleted: false, perfumes: 0 });
    expect(storageFake.removed).toEqual([]);
  });

  it("supprimer un parfum : ses visuels story partent, un visuel partagé avec une fiche dupliquée reste", async () => {
    const dior = await brand("Dior");
    const shared = catalogueImage();
    const sauvage = await perfume(dior.id, "Sauvage", { image: shared });
    await perfume(dior.id, "Sauvage Elixir", { image: shared });
    const story = await addStory(sauvage.id);

    expect(expectOk(await server.actions.deletePerfumeAction({ id: sauvage.id }))).toEqual({ id: sauvage.id, deleted: true });
    expect(storageFake.removed).toEqual([[story.url.slice(OWNED.length)]]);
    expect(expectOk(await server.actions.deletePerfumeAction({ id: sauvage.id }))).toEqual({ id: sauvage.id, deleted: false });
  });

  it("transaction annulée après le DELETE : rien n'est supprimé, ni en base ni dans le bucket", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    await addStory(sauvage.id);
    await expect(
      server.storage.commitThenRemoveObjects(async (tx) => {
        const out = await server.writer.deletePerfume(tx, sauvage.id);
        expect(out.remove).toHaveLength(2);
        throw new Error(INJECTED);
      }),
    ).rejects.toThrow(INJECTED);
    expect(storageFake.removed).toEqual([]);
    expect(await server.prisma.perfume.count()).toBe(1);
  });
});

// ── Stock et invalidation ──────────────────────────────────────────────────────

describe("stock et invalidation (04 §10, §11)", () => {
  it("réglage absolu : valeur, puis non suivi ; négatif refusé par le contrat", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    expect(expectOk(await server.actions.setPerfumeStockAction({ id: sauvage.id, stock: 2 }))).toEqual({
      id: sauvage.id,
      stock: 2,
      stockStatus: "low",
    });
    expect(expectOk(await server.actions.setPerfumeStockAction({ id: sauvage.id, stock: null })).stockStatus).toBe("untracked");
    expectError(await server.actions.setPerfumeStockAction({ id: sauvage.id, stock: -1 }), "VALIDATION");
    expect(expectError(await server.actions.setPerfumeStockAction({ id: 424242, stock: 1 }), "NOT_FOUND").message).toMatch(/n'existe plus/);
  });

  it("toute écriture du catalogue déclenche revalidateAdminCatalogue() ; un visuel story seul n'invalide pas la vitrine", async () => {
    const expectCatalogue = async (label: string, run: () => Promise<{ ok: boolean }>) => {
      cache.calls.length = 0;
      expect((await run()).ok, label).toBe(true);
      expect(cache.calls, label).toEqual(CATALOGUE_INVALIDATION);
    };
    const expectMedia = async (label: string, run: () => Promise<{ ok: boolean }>) => {
      cache.calls.length = 0;
      expect((await run()).ok, label).toBe(true);
      expect(cache.calls, label).toEqual(MEDIA_INVALIDATION);
    };

    let brandId = "";
    await expectCatalogue("createBrand", async () => {
      const result = await server.actions.createBrandAction({ name: "Dior" });
      if (result.ok) brandId = result.data.id;
      return result;
    });
    let perfumeId = 0;
    await expectCatalogue("createPerfume", async () => {
      const result = await server.actions.createPerfumeAction({ brand: { kind: "existing", brandId }, name: "Sauvage", image: catalogueImage() });
      if (result.ok) perfumeId = result.data.id;
      return result;
    });
    await expectCatalogue("updatePerfume", () =>
      server.actions.updatePerfumeAction({ id: perfumeId, pricing: [{ volumeMl: 80, unitPriceEur: "120" }] }),
    );
    await expectCatalogue("setPerfumeFeatured", () => server.actions.setPerfumeFeaturedAction({ id: perfumeId, featured: true }));
    await expectCatalogue("setPerfumeStock", () => server.actions.setPerfumeStockAction({ id: perfumeId, stock: 4 }));
    await expectCatalogue("setPerfumeStatus", () => server.actions.setPerfumeStatusAction({ id: perfumeId, status: "DRAFT" }));
    await expectCatalogue("updateBrand", () => server.actions.updateBrandAction({ id: brandId, name: "Christian Dior" }));
    await expectCatalogue("republish", () => server.actions.republishBrandPerfumesAction({ id: brandId }));
    await expectCatalogue("setBrandVisibility", () =>
      server.actions.setBrandVisibilityAction({ id: brandId, status: "DRAFT", confirm: true }),
    );

    let mediaId = "";
    await expectMedia("addPerfumeMedia", async () => {
      const result = await server.actions.addPerfumeMediaAction({ perfumeId, path: storyPath(perfumeId), width: 1080, height: 1920, bytes: 1 });
      if (result.ok) mediaId = result.data.id;
      return result;
    });
    await expectMedia("setPerfumeMediaLabel", () => server.actions.setPerfumeMediaLabelAction({ perfumeId, mediaId, label: "Story" }));
    const later = await addStory(perfumeId);
    await expectMedia("reorderPerfumeMedia", () =>
      server.actions.reorderPerfumeMediaAction({ perfumeId, orderedIds: [later.id, globalThis.crypto.randomUUID(), mediaId] }),
    );
    await expectMedia("removePerfumeMedia", () => server.actions.removePerfumeMediaAction({ perfumeId, mediaId }));

    cache.calls.length = 0;
    expectOk(await server.actions.createImageUploadUrlAction({ usage: "story", perfumeId, extension: "HEIC" }));
    expect(cache.calls).toEqual([]);

    await expectCatalogue("deletePerfume", () => server.actions.deletePerfumeAction({ id: perfumeId }));
    await expectCatalogue("deleteBrand", () => server.actions.deleteBrandAction({ id: brandId }));
  });

  it("URL signée : chemin fabriqué par le serveur, jamais pour un parfum absent", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    const ticket = expectOk(await server.actions.createImageUploadUrlAction({ usage: "story", perfumeId: sauvage.id, extension: "IMG_0042.HEIC" }));
    expect(ticket.path).toMatch(new RegExp(`^stories/${sauvage.id}/\\d{13}-[0-9a-f]{8}\\.heic$`));
    expect(ticket.publicUrl).toBe(`${OWNED}${ticket.path}`);
    expect(storageFake.clients.every((url) => url === "https://projet-essai-j11.supabase.co")).toBe(true);
    expectError(await server.actions.createImageUploadUrlAction({ usage: "story", perfumeId: 424242, extension: "webp" }), "NOT_FOUND");
    expect(storageFake.signed).toEqual([ticket.path]);
  });
});

// ── Lectures ───────────────────────────────────────────────────────────────────

describe("lectures du catalogue (04 §12, §15)", () => {
  it("instantané admin : comptes par marque, visuels story par parfum, emplacements de mise en avant", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    await perfume(dior.id, "Poison", { image: "" });
    await perfume(dior.id, "Dune");
    expectOk(await server.actions.setPerfumeStatusAction({ id: sauvage.id, status: "DRAFT" }));
    await addStory(sauvage.id);
    await addStory(sauvage.id);
    expectOk(await server.actions.setPerfumeStockAction({ id: sauvage.id, stock: 0 }));

    const snapshot = await server.queries.adminCatalogue();
    expect(snapshot.brands).toEqual([
      expect.objectContaining({ name: "Dior", slug: "dior", perfumeCount: 3, publishedCount: 1, republishableCount: 1, searchKey: "dior" }),
    ]);
    const row = snapshot.perfumes.find((p) => p.id === sauvage.id);
    expect(row).toMatchObject({
      mediaCount: 2,
      stock: 0,
      stockStatus: "out",
      status: "DRAFT",
      brand: { id: dior.id, name: "Dior", status: "PUBLISHED", catalogMode: "CURATED", image: null },
      searchKey: "sauvage dior",
    });
    expect(snapshot.featured).toEqual({ count: 0, limit: 2 });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot); // DTO sérialisable (unstable_cache)
  });

  it("fiche parfum : tarifs 10 · 50 · 80, activité hors documents annulés, visuels dans l'ordre", async () => {
    const dior = await brand("Dior");
    const sauvage = expectOk(
      await server.actions.createPerfumeAction({
        brand: { kind: "existing", brandId: dior.id },
        name: "Sauvage",
        image: catalogueImage(),
        pricing: [
          { volumeMl: 80, unitPriceEur: "120", unitCostDzd: "9000", exchangeRate: "277" },
          { volumeMl: 10, unitPriceEur: "25" },
        ],
      }),
    );
    const first = await addStory(sauvage.id);
    const second = await addStory(sauvage.id);
    expectOk(await server.actions.reorderPerfumeMediaAction({ perfumeId: sauvage.id, orderedIds: [second.id] }));
    await saleWith([{ perfumeId: sauvage.id, perfumeName: "Sauvage", brandName: "Dior", imageUrl: "" }]);
    const cancelled = await saleWith([{ perfumeId: sauvage.id, perfumeName: "Sauvage", brandName: "Dior", imageUrl: "" }]);
    await server.prisma.saleDocument.update({
      where: { id: cancelled.id },
      data: { status: "CANCELLED", confirmedAt: null, deliveredAt: null, cancelledAt: new Date() },
    });

    const sheet = await server.queries.perfumeSheet(sauvage.id);
    expect(sheet?.pricing).toEqual([
      { volumeMl: 10, unitPriceEur: "25.00", unitCostDzd: null, exchangeRate: null, unitCostEur: null },
      { volumeMl: 80, unitPriceEur: "120.00", unitCostDzd: "9000.00", exchangeRate: "277.00", unitCostEur: "32.49" },
    ]);
    expect(sheet?.activity).toMatchObject({ units: 1, documents: 1 });
    expect(sheet?.activity.lastSoldAt).toEqual(expect.any(String));
    expect(sheet?.media.map((m) => m.id)).toEqual([second.id, first.id]);
    expect(sheet?.perfume).toMatchObject({ stock: null, stockStatus: "untracked", brand: { slug: "dior" } });
    expect(await server.queries.perfumeSheet(424242)).toBeNull();

    expect(await server.queries.perfumeDuplicationDraft(sauvage.id)).toEqual({
      brand: { id: dior.id, name: "Dior", status: "PUBLISHED", catalogMode: "CURATED", image: null },
      pricing: sheet?.pricing,
    });
    expect(await server.queries.brandSheet(dior.id)).toMatchObject({ perfumeCount: 1, publishedCount: 1, republishableCount: 0 });
  });

  it("alertes de stock : rupture et stock bas, deux ensembles distincts ; un parfum non suivi n'y est jamais", async () => {
    const dior = await brand("Dior");
    const ids: Record<string, number> = {};
    for (const [name, stock] of [["Rupture", 0], ["Un", 1], ["Trois", 3], ["Quatre", 4], ["NonSuivi", null]] as const) {
      const p = await perfume(dior.id, name);
      ids[name] = p.id;
      expectOk(await server.actions.setPerfumeStockAction({ id: p.id, stock }));
    }
    expect(await server.queries.stockAlerts()).toEqual({
      threshold: 3,
      out: { count: 1, perfumeIds: [ids.Rupture] },
      low: { count: 2, perfumeIds: [ids.Un, ids.Trois] },
    });
  });

  it("sélecteur : tous statuts avec leur grille ; version stable sans écriture, nouvelle quand le contenu change", async () => {
    const dior = await brand("Dior");
    const sauvage = await perfume(dior.id, "Sauvage");
    await perfume(dior.id, "Poison", { image: "" });
    const first = await server.queries.pickerCatalogue();
    expect(first.perfumes.map((p) => [p.name, p.status])).toEqual([
      ["Poison", "DRAFT"],
      ["Sauvage", "PUBLISHED"],
    ]);
    expect(await server.queries.pickerVersion()).toBe(first.version);

    expectOk(await server.actions.updatePerfumeAction({ id: sauvage.id, pricing: [{ volumeMl: 50, unitPriceEur: "90" }] }));
    const second = await server.queries.pickerCatalogue();
    expect(second.version).not.toBe(first.version);
    expect(second.perfumes.find((p) => p.id === sauvage.id)?.pricing.map((p) => p.volumeMl)).toEqual([50]);

    expectOk(await server.actions.addPerfumeMediaAction({ perfumeId: sauvage.id, path: storyPath(sauvage.id), width: 1, height: 1, bytes: 1 }));
    expect((await server.queries.pickerCatalogue()).version).toBe(second.version);
  });
});

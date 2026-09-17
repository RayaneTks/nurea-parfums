import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OWNED,
  catalogueImage,
  expectOk,
  freshStart,
  loadCatalogueServer,
  stamp,
  storyPath,
  type CatalogueServer,
} from "./support/catalogue";

/**
 * Contrat vitrine (01 §5, 03 §6, 04 §12) : la lecture publique de `src/lib/catalogue-service.ts` rend les
 * MÊMES cartes avant et après une série d'écritures de la gestion qui ne changent rien au public (stock,
 * tarifs, visuels story, fiche masquée créée puis supprimée, renommage aller-retour, masquage puis
 * republication) ; et chaque écriture visible produit exactement l'effet attendu (compte des cartes).
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
  // Le cache public est traversé : chaque lecture relit la base.
  unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock("next/headers", () => ({ cookies: async () => cookieJar.current }));
vi.mock("@supabase/supabase-js", async () => (await import("./support/catalogue")).fakeSupabaseModule());

let server: CatalogueServer;
let getCachedCatalogue: typeof import("@/lib/catalogue-service").getCachedCatalogue;

beforeAll(async () => {
  server = await loadCatalogueServer();
  getCachedCatalogue = (await import("@/lib/catalogue-service")).getCachedCatalogue;
});

afterAll(async () => {
  await server?.prisma.$disconnect();
});

beforeEach(async () => {
  cookieJar.current = await freshStart(server);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

/** Ce que voit le visiteur : cartes et panneau Explorer, dans un ordre stable. */
async function publicView() {
  const { perfumes, browseBrands } = await getCachedCatalogue();
  return {
    cards: perfumes
      .map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        brandSlug: p.brandSlug,
        category: p.category,
        image: p.image,
        imageLight: p.imageLight ?? null,
        isFeatured: p.isFeatured ?? false,
      }))
      .sort((a, b) => a.id - b.id),
    browse: browseBrands.map((b) => ({ name: b.name, slug: b.slug, assortment: b.assortment, publishedCount: b.publishedCount })),
  };
}

describe("contrat vitrine : mêmes cartes avant et après des écritures cohérentes de la gestion", () => {
  it("écritures sans effet public, puis effets visibles attendus, puis retour à l'identique", async () => {
    // Catalogue de départ, entièrement écrit par les actions de la gestion.
    const dior = expectOk(await server.actions.createBrandAction({ name: "Dior" }));
    const guerlain = expectOk(
      await server.actions.createBrandAction({ name: "Guerlain", catalogMode: "COMPLETE", image: `${OWNED}brands/${stamp()}.webp` }),
    );
    const lattafa = expectOk(await server.actions.createBrandAction({ name: "Lattafa" }));
    const chanel = expectOk(await server.actions.createBrandAction({ name: "Chanel", status: "DRAFT" }));
    const create = async (brandId: string, name: string, image = catalogueImage()) =>
      expectOk(await server.actions.createPerfumeAction({ brand: { kind: "existing", brandId }, name, image, imageLight: `${OWNED}perfumes/${stamp()}.webp` }));

    const sauvage = await create(dior.id, "Sauvage");
    const fahrenheit = await create(dior.id, "Fahrenheit");
    await create(dior.id, "Poison", "");
    await create(guerlain.id, "Shalimar");
    const khamrah = await create(lattafa.id, "Khamrah");
    await create(chanel.id, "Bleu");
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: sauvage.id, featured: true }));

    const initial = await publicView();
    expect(initial.cards.map((c) => c.name)).toEqual(["Sauvage", "Fahrenheit", "Khamrah", "Guerlain"]);
    expect(initial.cards.find((c) => c.name === "Sauvage")).toMatchObject({ brandSlug: "dior", isFeatured: true });
    expect(initial.browse).toEqual([
      { name: "Dior", slug: "dior", assortment: "CURATED", publishedCount: 2 },
      { name: "Guerlain", slug: "guerlain", assortment: "COMPLETE", publishedCount: 0 },
      { name: "Lattafa", slug: "lattafa", assortment: "CURATED", publishedCount: 1 },
    ]);

    // 1. Écritures sans effet public : stock, tarifs, visuels story, fiche masquée créée puis supprimée.
    expectOk(await server.actions.setPerfumeStockAction({ id: sauvage.id, stock: 3 }));
    expectOk(await server.actions.setPerfumeStockAction({ id: fahrenheit.id, stock: null }));
    expectOk(
      await server.actions.updatePerfumeAction({
        id: fahrenheit.id,
        name: "Fahrenheit",
        pricing: [
          { volumeMl: 10, unitPriceEur: "25" },
          { volumeMl: 80, unitPriceEur: "120", unitCostDzd: "30000", exchangeRate: "277" },
        ],
      }),
    );
    const story = expectOk(
      await server.actions.addPerfumeMediaAction({ perfumeId: sauvage.id, path: storyPath(sauvage.id), width: 1080, height: 1920, bytes: 1 }),
    );
    expectOk(await server.actions.setPerfumeMediaLabelAction({ perfumeId: sauvage.id, mediaId: story.id, label: "Story" }));
    expectOk(await server.actions.removePerfumeMediaAction({ perfumeId: sauvage.id, mediaId: story.id }));
    const draft = await create(dior.id, "Hypnotic Poison", "");
    expectOk(await server.actions.deletePerfumeAction({ id: draft.id }));
    expect(await publicView()).toEqual(initial);

    // 2. Masquer un parfum : une carte de moins ; le republier : identique.
    expectOk(await server.actions.setPerfumeStatusAction({ id: fahrenheit.id, status: "DRAFT" }));
    expect((await publicView()).cards).toHaveLength(initial.cards.length - 1);
    expectOk(await server.actions.setPerfumeStatusAction({ id: fahrenheit.id, status: "PUBLISHED" }));
    expect(await publicView()).toEqual(initial);

    // 3. Masquer une marque (T14) : ses cartes et son entrée Explorer disparaissent ; visible + republier : identique.
    expectOk(await server.actions.setBrandVisibilityAction({ id: lattafa.id, status: "DRAFT", confirm: true }));
    const hidden = await publicView();
    expect(hidden.cards.map((c) => c.name)).not.toContain("Khamrah");
    expect(hidden.browse.map((b) => b.slug)).toEqual(["dior", "guerlain"]);
    const visible = expectOk(await server.actions.setBrandVisibilityAction({ id: lattafa.id, status: "PUBLISHED" }));
    expect(visible.republishable).toBe(1);
    expectOk(await server.actions.republishBrandPerfumesAction({ id: lattafa.id }));
    expect(await publicView()).toEqual(initial);

    // 4. Renommer une marque : le slug public ne bouge pas ; renommage aller-retour : identique.
    expectOk(await server.actions.updateBrandAction({ id: dior.id, name: "Christian Dior" }));
    const renamed = await publicView();
    expect(renamed.cards.filter((c) => c.brandSlug === "dior").map((c) => c.brand)).toEqual(["Christian Dior", "Christian Dior"]);
    expect(renamed.browse[0]).toEqual({ name: "Christian Dior", slug: "dior", assortment: "CURATED", publishedCount: 2 });
    expectOk(await server.actions.updateBrandAction({ id: dior.id, name: "Dior" }));
    expect(await publicView()).toEqual(initial);

    // 5. Mise en avant retirée puis rendue : identique. Chanel masquée reste invisible malgré ses fiches.
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: sauvage.id, featured: false }));
    expect((await publicView()).cards.filter((c) => c.isFeatured)).toEqual([]);
    expectOk(await server.actions.setPerfumeFeaturedAction({ id: sauvage.id, featured: true }));
    expect(await publicView()).toEqual(initial);

    // 6. Supprimer un parfum visible : une carte de moins, le compte Explorer suit.
    expectOk(await server.actions.deletePerfumeAction({ id: khamrah.id }));
    const deleted = await publicView();
    expect(deleted.cards.map((c) => c.name)).toEqual(["Sauvage", "Fahrenheit", "Guerlain"]);
    expect(deleted.browse.map((b) => b.slug)).toEqual(["dior", "guerlain"]);
  });
});

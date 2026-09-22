import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { formatEur, parseEurInput } from "../../src/domain/money";
import { waitForHydration } from "../helpers/hydration";
import { withE2eDb } from "../helpers/db";

/**
 * Repères communs des parcours du composeur Vendre (07 J9) : ce que le gérant voit et touche, nommé comme l'écran le
 * nomme. Chaque parcours part de l'app ouverte sur l'Accueil, sans brouillon (02 §2 : « depuis l'ouverture de l'app »).
 */

/**
 * Ouvre l'app sur un écran, appareil vierge de tout brouillon — UNE fois : les chargements suivants (retour de
 * connexion, rechargement) doivent retrouver le brouillon que le composeur a écrit.
 */
export async function openFresh(page: Page, url: string): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("__e2e-brouillon-vide")) return;
    sessionStorage.setItem("__e2e-brouillon-vide", "1");
    localStorage.clear();
  });
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
}

export const tab = (page: Page, name: string) => page.locator("[data-tabbar]").getByRole("link", { name, exact: true });

/** Une tuile « Vendus récemment » (N7), par le nom du parfum. */
export const tile = (page: Page, name: string) => page.locator("[data-recent-tile]").filter({ hasText: name }).first();

/** Le bouton principal du composeur (06 E11 zone 9). */
export const cta = (page: Page) => page.locator("[data-composer-cta]");

export const composer = (page: Page) => page.locator("[data-composer]");

/** La carte de confirmation (06 E11 zone 3). */
export const confirmationCard = (page: Page) => page.locator("[data-confirmation-card]");

/** La sheet ouverte au-dessus du composeur (S05, S06, S07, S08). */
export const openSheet = (page: Page) => page.locator('[data-vaul-drawer][data-state="open"]').last();

export const dialog = (page: Page) => page.locator("[data-confirm-dialog]");

export const toast = (page: Page) => page.locator("[data-admin-toast]");

/** Attend que la grille des récents soit là : le composeur est prêt à recevoir un tap. */
export async function waitForComposer(page: Page): Promise<void> {
  await expect(page.locator("[data-composer]")).toBeVisible();
  await waitForHydration(page.locator("[data-recent-tile]").first());
}

/**
 * Les documents que l'écran a écrits, du plus récent au plus ancien : par nom de client de passage, par fiche liée,
 * ou par parfum d'une ligne (une vente de passage n'a pas de nom). `exclude` écarte les documents du jeu.
 */
export function documentsOf(filter: { customerName?: string; customerId?: string; perfume?: string; exclude?: readonly string[] }) {
  return withE2eDb((db) =>
    db.saleDocument.findMany({
      where: {
        ...(filter.customerName === undefined ? {} : { customerName: filter.customerName }),
        ...(filter.customerId === undefined ? {} : { customerId: filter.customerId }),
        ...(filter.perfume === undefined ? {} : { lines: { some: { perfumeName: filter.perfume } } }),
        ...(filter.exclude === undefined ? {} : { id: { notIn: [...filter.exclude] } }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        origin: true,
        status: true,
        batchId: true,
        expectedDeliveryAt: true,
        customerId: true,
        notes: true,
        lines: { orderBy: { position: "asc" }, select: { perfumeName: true, brandName: true, volumeMl: true, quantity: true, unitPriceEur: true, isGift: true, unitCostEur: true, note: true, isOffCatalog: true } },
        payments: { select: { kind: true, movement: { select: { amount: true, pocketId: true, pocket: { select: { name: true } } } } } },
      },
    }),
  );
}

export function stockOf(perfumeName: string) {
  return withE2eDb(async (db) => (await db.perfume.findFirstOrThrow({ where: { name: perfumeName }, select: { stock: true } })).stock);
}

export function pricingOf(perfumeName: string, volumeMl: number) {
  return withE2eDb(async (db) => {
    const perfume = await db.perfume.findFirstOrThrow({ where: { name: perfumeName }, select: { id: true } });
    return db.perfumePricing.findUnique({
      where: { perfumeId_volumeMl: { perfumeId: perfume.id, volumeMl } },
      select: { defaultUnitPriceEur: true, defaultUnitCostDzd: true, updatedAt: true },
    });
  });
}

/** Chronomètre d'un parcours (06 §2) : la mesure est consignée dans le rapport du test. */
export function chrono(testInfo: TestInfo, label: string) {
  const started = Date.now();
  return (taps: number) => {
    const seconds = (Date.now() - started) / 1000;
    const line = `${label} : ${taps} taps, ${seconds.toFixed(1)} s`;
    testInfo.annotations.push({ type: "chrono", description: line });
    console.log(`⏱ ${line}`);
    return seconds;
  };
}

/** « 120,00 € » tel que l'écran l'écrit (espace fine insécable). */
export function euros(amount: string): string {
  const parsed = parseEurInput(amount);
  if (!parsed) throw new Error(`euros : montant illisible « ${amount} »`);
  return formatEur(parsed);
}

export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await expect(toast(page).filter({ hasText: text })).toBeVisible();
}

/** Le contenu d'une carte de ligne du composeur (prix, volume, quantité). */
export const lineCard = (page: Page, perfume: string) => page.locator("[data-edit-line]").filter({ hasText: perfume }).first() as Locator;

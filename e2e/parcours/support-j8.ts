import { expect, type Locator, type Page } from "@playwright/test";
import { formatEur, parseEurInput } from "../../src/domain/money";
import { waitForHydration } from "../helpers/hydration";

/**
 * Repères communs des parcours du jalon J8 (fiche document, Commandes, À encaisser) : ce que le gérant voit et
 * touche, nommé comme l'écran le nomme.
 */

export async function openShell(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
}

/** « 80,00 € » tel que l'écran l'écrit (espace fine insécable). */
export function euros(amount: string): string {
  const parsed = parseEurInput(amount);
  if (!parsed) throw new Error(`euros : montant illisible « ${amount} »`);
  return formatEur(parsed);
}

export const tab = (page: Page, name: string) => page.locator("[data-tabbar]").getByRole("link", { name, exact: true });

/** La fiche document ouverte (S01). */
export const documentSheet = (page: Page) => page.locator('[data-vaul-drawer][data-state="open"]').filter({ has: page.locator("[data-document-sheet]") });

/** Une sheet d'action ouverte, repérée par son titre (« Acompte · Mehdi Larbi »). */
export const actionSheet = (page: Page, title: string) =>
  page.locator('[data-vaul-drawer][data-state="open"]').filter({ has: page.getByRole("heading", { name: title, exact: true }) });

/** La ligne d'une commande dans la liste (E10), par le nom du client. */
export const orderRow = (page: Page, name: string) => page.locator("[data-order-row]").filter({ hasText: name });

/** Le conteneur glissable d'une ligne, qui porte les actions révélées. */
export const swipeContainer = (row: Locator) => row.locator("xpath=../..");

export const toast = (page: Page) => page.locator("[data-admin-toast]");

export async function expectToast(page: Page, text: string): Promise<void> {
  await expect(toast(page).filter({ hasText: text })).toBeVisible();
}

/** Marqueur posé dans la page : s'il survit, l'écran s'est mis à jour sans rechargement (principe 6 de 02). */
export async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __sansRechargement?: boolean }).__sansRechargement = true;
  });
}

export async function expectNoReload(page: Page): Promise<void> {
  expect(await page.evaluate(() => (window as unknown as { __sansRechargement?: boolean }).__sansRechargement === true)).toBe(true);
}

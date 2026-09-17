import type { Locator } from "@playwright/test";

/**
 * Attend que React ait repris la main sur un élément rendu par le serveur : avant, un tap sur un
 * bouton de formulaire part en envoi natif, et le test mesurerait autre chose que l'app.
 */
export async function waitForHydration(locator: Locator, timeout = 60_000): Promise<void> {
  await locator.waitFor({ timeout });
  await locator.page().waitForFunction(
    (el) => !!el && Object.keys(el).some((key) => key.startsWith("__reactProps")),
    await locator.elementHandle(),
    { timeout },
  );
}

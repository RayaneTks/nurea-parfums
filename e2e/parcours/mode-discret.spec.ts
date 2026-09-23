import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { DISCRET_COOKIE } from "../../src/contracts/discretion";
import { NEWS_SEEN_KEY } from "../../src/contracts/stats";
import { waitForHydration } from "../helpers/hydration";
import { BASE_URL } from "../support/env";
import { openShell } from "./support-j8";

/**
 * Mode discret — montrer l'app sans montrer ce qu'elle contient (`src/contracts/discretion.ts`).
 *
 * Ce que ce parcours prouve, et qu'une relecture de code ne prouve pas :
 *
 *  1. sans le témoin, RIEN n'est brouillé — le mode ne s'invite pas tout seul ;
 *  2. avec le témoin, l'attribut est sur la racine du shell et les montants sont RÉELLEMENT flous
 *     (le filtre calculé par le navigateur est lu, pas la classe qu'on a écrite) ;
 *  3. le brouillage suit le montant PARTOUT : Accueil, Commandes, À encaisser, Clients — c'est
 *     l'intérêt d'avoir marqué `Money` plutôt que chaque écran ;
 *  4. les noms de PARFUMS restent lisibles : on montre son catalogue, on cache son argent ;
 *  5. l'interrupteur des Réglages bascule les deux sens, et l'effet est immédiat.
 */

const racineDiscrete = (page: Page) => page.locator("[data-discret='1']");
const secrets = (page: Page) => page.locator("[data-secret]");

/** Le flou tel que le NAVIGATEUR l'a calculé : la seule preuve qui vaille. */
async function flouCalcule(page: Page): Promise<string> {
  return secrets(page)
    .first()
    .evaluate((el) => getComputedStyle(el).filter);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
});

test("sans le témoin, rien n'est brouillé", async ({ page }) => {
  await openShell(page, routes.accueil());
  await expect(racineDiscrete(page)).toHaveCount(0);
  // Les montants sont marqués en permanence — la marque ne dit pas que le mode est actif.
  await expect(secrets(page).first()).toBeVisible();
  expect(await flouCalcule(page)).toBe("none");
});

test("avec le témoin, tous les montants sont réellement flous, sur tous les écrans", async ({ page, context }) => {
  await context.addCookies([{ name: DISCRET_COOKIE, value: "1", url: BASE_URL }]);

  for (const [nom, url] of [
    ["Accueil", routes.accueil()],
    ["Commandes", routes.commandes()],
    ["À encaisser", routes.encaisser()],
    ["Clients", routes.clients()],
  ] as const) {
    await openShell(page, url);
    await expect(racineDiscrete(page), `${nom} : la racine porte l'attribut`).toHaveCount(1);
    const marques = await secrets(page).count();
    expect(marques, `${nom} : au moins un élément marqué`).toBeGreaterThan(0);
    expect(await flouCalcule(page), `${nom} : le navigateur applique bien un flou`).toContain("blur");
  }
});

test("le catalogue reste lisible : on montre ses parfums, on cache son argent", async ({ page, context }) => {
  await context.addCookies([{ name: DISCRET_COOKIE, value: "1", url: BASE_URL }]);
  await openShell(page, routes.catalogue());

  await expect(racineDiscrete(page)).toHaveCount(1);

  /*
   * Le catalogue ne porte AUCUN montant — vérifié ici plutôt que supposé : la liste donne le parfum,
   * la marque et le stock, jamais un prix (les prix vivent sur la fiche). Il n'y a donc rien à y
   * brouiller, et c'est très bien : c'est l'écran qu'on montre le plus volontiers.
   */
  expect(await secrets(page).count(), "le catalogue ne rend aucun montant").toBe(0);

  // Et les noms de parfums restent nets : c'est précisément ce qu'on veut faire voir.
  const nomDeParfum = page.getByText("Asad", { exact: false }).first();
  await expect(nomDeParfum).toBeVisible();
  expect(await nomDeParfum.evaluate((el) => getComputedStyle(el).filter)).toBe("none");
});

test("l'interrupteur des Réglages bascule dans les deux sens, tout de suite", async ({ page }) => {
  await openShell(page, routes.reglages());
  const interrupteur = page.getByRole("switch", { name: "Mode discret" });
  await waitForHydration(interrupteur);
  await expect(interrupteur).toHaveAttribute("aria-checked", "false");
  await expect(racineDiscrete(page)).toHaveCount(0);

  await interrupteur.tap();
  await expect(interrupteur).toHaveAttribute("aria-checked", "true");
  // Immédiat : le rendu serveur est rafraîchi sans navigation.
  await expect(racineDiscrete(page)).toHaveCount(1, { timeout: 15_000 });

  await interrupteur.tap();
  await expect(interrupteur).toHaveAttribute("aria-checked", "false");
  await expect(racineDiscrete(page)).toHaveCount(0, { timeout: 15_000 });
});

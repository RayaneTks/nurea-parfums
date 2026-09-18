import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { figurePeriodLabel } from "../../src/contracts/compta";
import { NEWS_SEEN_KEY } from "../../src/contracts/stats";
import { DOCS, PASSING } from "../fixtures/documents";
import { documentBalance } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import {
  actionSheet,
  documentSheet,
  euros,
  expectNoReload,
  expectToast,
  markDocument,
  openShell,
  orderRow,
  tab,
} from "./support-j8";

/**
 * Lecture de ses propres écritures (04 §10.2 ; principe 6 de 02 ; 07 J8) : après un encaissement, l'écran
 * reflète le nouvel état SANS rechargement ni re-navigation — la fiche (Payé, À encaisser, pied), la liste
 * Commandes sous la fiche, et un autre écran (À encaisser) rendu par ses blocs streamés. Le document n'est jamais
 * rechargé : un marqueur posé dans la page survit à tout le parcours.
 *
 * J14 — et l'Accueil : en revenant dessus, « Encaissé · (mois) » a augmenté du montant encaissé, sans
 * rechargement manuel (critère de J14). L'invalidation `admin-catalogue` vue par le catalogue relève des
 * parcours du catalogue (J11).
 */

test("après un encaissement : fiche, liste et À encaisser à jour, sans rechargement", async ({ page }) => {
  await openShell(page, routes.commandes());
  await markDocument(page);
  const navigations: string[] = [];
  page.on("load", () => navigations.push(page.url()));

  const line = orderRow(page, PASSING.lecture);
  await waitForHydration(line.getByRole("button").first());
  await expect(line).toContainText(euros("100"));
  await line.getByRole("button").first().tap();
  const fiche = documentSheet(page);
  const cta = fiche.getByRole("button", { name: `Encaisser ${euros("100")}`, exact: true });
  await waitForHydration(cta);
  await expect(fiche.locator('[data-money-tile="Payé"]')).toContainText(euros("50"));

  await cta.tap();
  const collect = actionSheet(page, `Encaisser · ${PASSING.lecture}`);
  await collect.getByRole("button", { name: `Encaisser ${euros("100")} · Espèces` }).tap();
  await expectToast(page, `${euros("100")} encaissés · Espèces`);

  // La fiche : Payé, À encaisser et pied, dans le même document.
  await expect(fiche.locator('[data-money-tile="Payé"]')).toContainText(euros("150"));
  await expect(fiche.locator('[data-money-tile="À encaisser"]')).toContainText(euros("0"));
  await expect(fiche.getByRole("button", { name: `Encaisser ${euros("100")}`, exact: true })).toHaveCount(0);
  await expectNoReload(page);

  // La liste sous la fiche : plus de montant à encaisser sur la ligne.
  await fiche.getByRole("button", { name: "Fermer", exact: true }).tap();
  await expect(fiche).toBeHidden();
  await expect(orderRow(page, PASSING.lecture)).not.toContainText(euros("100"));

  // Un autre écran : la créance a quitté À encaisser.
  await tab(page, "Clients").tap();
  await page.getByRole("button", { name: "Rechercher" }).tap();
  await page.getByRole("dialog", { name: "Recherche" }).getByRole("button", { name: "À encaisser" }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "À encaisser" })).toBeVisible();
  await expect(page.locator("[data-receivables]")).toBeVisible();
  await expect(page.getByText(PASSING.lecture, { exact: true })).toHaveCount(0);

  await expectNoReload(page);
  expect(navigations).toEqual([]);
  expect(await documentBalance(DOCS.lecture)).toMatchObject({ paid: "150.00", due: "0.00" });
});

/**
 * Le même principe sur l'ACCUEIL (critère de J14) : « Encaissé · (mois) » reflète l'encaissement dès le
 * retour sur l'écran, sans rechargement manuel — c'est l'invalidation par tag (04 §10.2) qui l'obtient, pas
 * un `router.refresh()` posé à la main.
 *
 * L'écran est mesuré avant/après sur la MÊME session : l'écart vaut exactement le montant encaissé, quels que
 * soient les autres parcours (ils tournent sur d'autres documents, et la mesure encadre le geste).
 */
test("après un encaissement : « Encaissé · (mois) » de l'Accueil a augmenté du montant, sans rechargement", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
  await openShell(page, routes.accueil());
  // L'indicateur des outils de `next dev` se pose en bas à gauche, PAR-DESSUS l'onglet Accueil : il intercepte
  // le toucher. Il n'existe pas en production — on l'écarte, comme les captures de revue.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  // Marqueur posé dans la page : il ne survivrait pas à un rechargement, donc son absence en dirait un.
  await markDocument(page);
  const mois = figurePeriodLabel("mois", null);
  const tile = page.locator("[data-money-block] a", { has: page.getByText(`Encaissé · ${mois}`, { exact: true }) }).first();
  await expect(tile).toBeVisible();
  const shownAmount = async () => (await tile.locator("span[aria-hidden]").first().innerText()).trim();
  const before = await shownAmount();

  const navigations: string[] = [];
  page.on("load", () => navigations.push(page.url()));

  // Encaisser une créance depuis À encaisser, puis revenir à l'Accueil par son onglet.
  await tab(page, "Clients").tap();
  await page.getByRole("button", { name: "Rechercher" }).tap();
  await page.getByRole("dialog", { name: "Recherche" }).getByRole("button", { name: "À encaisser" }).tap();
  await expect(page.locator("[data-receivables]")).toBeVisible();
  const cta = page.getByRole("button", { name: `Encaisser ${euros("70")} · ${PASSING.accueil}`, exact: true });
  await waitForHydration(cta);
  await cta.tap();
  const collect = actionSheet(page, `Encaisser · ${PASSING.accueil}`);
  await collect.getByRole("button", { name: `Encaisser ${euros("70")} · Espèces` }).tap();
  await expectToast(page, `${euros("70")} encaissés · Espèces`);

  await tab(page, "Accueil").tap();
  await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible();
  await expect(tile).toBeVisible();
  // Le montant a changé : l'Accueil relit ses chiffres sans que personne ne recharge la page.
  await expect.poll(shownAmount, { timeout: 15_000 }).not.toBe(before);
  await expectNoReload(page);
  expect(navigations).toEqual([]);
});

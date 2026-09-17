import { expect, test, type Locator, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { ECHEC_CONFIRMATION, TOAST_MESSAGE } from "../fixtures/couches-contrat";
import { mountScene } from "../helpers/banc";
import { waitForHydration } from "../helpers/hydration";
import { collectLayerPaintViolations } from "../helpers/layoutInvariants";
import { countTaps } from "../helpers/tap";

/**
 * Les couches par-dessus l'écran (05 §2.7, §3.1, §3.2 ; correctifs de production `3291428`,
 * `12e2327`) : le filet « Annuler » répond sous une sheet, une confirmation passe au-dessus d'une
 * sheet imbriquée, et son échec se lit dans la boîte.
 *
 * Aucun écran livré n'ouvre encore de sheet (J4) : les briques réelles sont montées par le banc
 * `e2e/fixtures/couches.tsx` dans `/admin`, sous la feuille admin de l'app. À remplacer par les
 * parcours réels quand S01 arrive (J8).
 */

async function openShell(page: Page) {
  await page.goto(routes.accueil());
  await waitForHydration(page.locator("[data-tabbar] a").first());
}

/**
 * Ce que le doigt toucherait au centre de l'élément : `null` si c'est lui (ou un descendant), sinon la
 * description de ce qui le recouvre — un élément `pointer-events: none` est traversé par le toucher.
 */
function whatCovers(target: Locator): Promise<string | null> {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit !== null && el.contains(hit)) return null;
    if (hit === null) return "rien (hors fenêtre)";
    const s = getComputedStyle(el);
    return `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 80)} (cible : pointer-events ${s.pointerEvents}, opacité ${s.opacity})`;
  });
}

const zIndexOf = (layer: Locator) => layer.evaluate((el) => Number(getComputedStyle(el).zIndex));

/**
 * Panneau de sheet par son titre. Pas `getByRole("dialog")` : une couche ouverte par-dessus marque
 * les autres `aria-hidden`, et le rôle ne les trouve plus — alors qu'elles sont toujours là.
 */
const sheetTitled = (page: Page, title: string) => page.locator("[data-vaul-drawer]").filter({ hasText: title });

test("sheet ouverte : le filet « Annuler » passe au-dessus, répond au doigt et laisse la sheet ouverte", async ({ page }, testInfo) => {
  await openShell(page);
  await mountScene(page, testInfo, "toast-sous-sheet");
  const taps = countTaps(page);

  const sheet = sheetTitled(page, "Commande de Fares");
  await expect(sheet).toBeVisible();
  // La couche modale neutralise le corps du document : c'est ce qui rendait le filet intapable.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).pointerEvents)).toBe("none");

  await taps.tap(sheet.getByRole("button", { name: "Supprimer la ligne" }));
  await expect(sheet.getByText("Ligne masquée")).toBeVisible();

  const toast = page.locator("[data-admin-toast]").filter({ hasText: TOAST_MESSAGE });
  await expect(toast).toBeVisible();
  expect(await toast.evaluate((el) => el.parentElement === document.body), "toast portalisé vers <body>").toBe(true);
  expect(await zIndexOf(toast)).toBeGreaterThan(await zIndexOf(sheet));

  // Posé droit, dans la fenêtre, au-dessus de la tab bar.
  const box = await toast.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport).toBeTruthy();
  if (box && viewport) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(Math.abs(box.x - (viewport.width - (box.x + box.width))), "centré").toBeLessThanOrEqual(1);
  }

  const annuler = toast.getByRole("button", { name: "Annuler" });
  expect(await whatCovers(annuler), "« Annuler » reçoit le toucher, rien ne le recouvre").toBeNull();
  await taps.tap(annuler);

  await expect(sheet.getByText("Ligne restaurée")).toBeVisible();
  await expect(toast).toBeHidden();
  // Toucher le filet n'est pas « toucher à côté » de la sheet : elle reste ouverte.
  await expect(sheet).toBeVisible();
  expect(await collectLayerPaintViolations(page)).toEqual([]);
  taps.expectAtMost(2);
});

test("confirmation depuis une sheet imbriquée : elle passe devant, et son échec s'affiche dans la boîte", async ({ page }, testInfo) => {
  await openShell(page);
  await mountScene(page, testInfo, "confirmation-en-echec");
  const taps = countTaps(page);

  const sheet = sheetTitled(page, "Commande de Fares");
  await taps.tap(sheet.getByRole("button", { name: "Voir le paiement" }));
  const nested = sheetTitled(page, "Paiement du 12 septembre");
  await expect(nested).toBeVisible();
  await taps.tap(nested.getByRole("button", { name: "Supprimer le paiement" }));

  const boite = page.locator("[data-confirm-dialog]");
  await expect(boite).toBeVisible();
  await expect(boite.getByRole("button", { name: "Annuler" })).toBeFocused();

  // Bandes distinctes (05 §2.7) : sheet < sheet imbriquée < confirmation.
  const [zSheet, zNested, zBoite] = await Promise.all([zIndexOf(sheet), zIndexOf(nested), zIndexOf(boite)]);
  expect(zSheet).toBeLessThan(zNested);
  expect(zNested).toBeLessThan(zBoite);
  // Voiles translucides, cartes sur leur surface (`.admin-theme` ne peint pas, 05 §2).
  expect(await collectLayerPaintViolations(page)).toEqual([]);

  const supprimer = boite.getByRole("button", { name: "Supprimer", exact: true });
  await expect.poll(() => whatCovers(supprimer), "la confirmation n'est pas recouverte par la sheet imbriquée").toBeNull();

  // Première tentative : l'écriture échoue.
  await taps.tap(supprimer);
  await expect(supprimer).toHaveAttribute("aria-busy", "true");
  const alerte = boite.getByRole("alert");
  await expect(alerte).toHaveText(ECHEC_CONFIRMATION);
  // La boîte reste ouverte, boutons rétablis, et aucun toast inerte derrière elle.
  await expect(boite).toBeVisible();
  await expect(supprimer).toBeEnabled();
  await expect(supprimer).not.toHaveAttribute("aria-busy", "true");
  await expect(boite.getByRole("button", { name: "Annuler" })).toBeEnabled();
  await expect(page.locator("[data-admin-toast]")).toHaveCount(0);
  await expect(sheet.locator("[data-banc-issue]")).toHaveText("en attente");

  // Réessayer depuis la boîte : l'écriture passe, la boîte se ferme, la confirmation est rendue.
  await taps.tap(supprimer);
  await expect(boite).toBeHidden();
  await expect(sheet.locator("[data-banc-issue]")).toHaveText("confirmé après 2 tentatives");
  taps.expectAtMost(4);
});

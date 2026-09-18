import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { waitForHydration } from "../helpers/hydration";
import { png, storedImage, storedKeys, tiffNamedPng } from "../helpers/images";
import { countTaps } from "../helpers/tap";

/**
 * PC-07 — Ajouter un parfum au catalogue, photo comprise (06 §2 ; 02 §2 tâche n°7 ; 07 J11) :
 * création avec image en moins de 90 s et au plus 9 taps, visibilité basculée en 1 tap, publication
 * refusée sans visuel avec le message du domaine et l'œil restauré.
 */

async function openShell(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
}

const drawer = (page: Page) => page.locator('[data-vaul-drawer][data-state="open"]');

test("PC-07 : un parfum créé avec sa photo, depuis l'Accueil, en 9 taps au plus et moins de 90 s", async ({ page }, testInfo) => {
  testInfo.setTimeout(150_000);
  const photo = await png("IMG_4021.png", 1200, 1600);
  const perfumeKeysBefore = new Set((await storedKeys()).filter((key) => key.startsWith("catalog/perfumes/")));
  await openShell(page, routes.accueil());
  const taps = countTaps(page);
  const started = Date.now();

  await taps.tap(page.locator("[data-tabbar]").getByRole("link", { name: "Catalogue", exact: true }), "onglet Catalogue");
  // Le bloc de la liste est streamé : toucher avant l'hydratation ne ferait rien (un humain attend l'écran).
  await waitForHydration(page.getByRole("button", { name: "Nouveau parfum", exact: true }));
  await taps.tap(page.getByRole("button", { name: "Nouveau parfum", exact: true }), "+ Parfum");
  await expect(page.getByRole("heading", { level: 1, name: "Nouveau parfum" })).toBeVisible();
  await waitForHydration(page.getByRole("button", { name: "Choisir la marque", exact: true }).first());

  await taps.tap(page.getByRole("button", { name: "Choisir la marque", exact: true }).first(), "rangée Marque");
  await expect(drawer(page)).toBeVisible();
  await taps.tap(drawer(page).getByRole("button", { name: /^Dior\b/ }).first(), "Dior");
  await expect(drawer(page)).toBeHidden();

  // Le CTA guide vers ce qui manque, et le champ du nom prend le focus.
  await expect(page.getByRole("button", { name: "Saisir le nom", exact: true })).toBeVisible();
  await page.getByLabel("Nom du parfum", { exact: true }).fill("sauvage elixir");
  await expect(page.getByText("Sera enregistré : Sauvage Elixir")).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await taps.tap(page.getByRole("button", { name: "Importer", exact: true }).first(), "Ajouter la photo");
  await (await chooser).setFiles(photo);
  // Photothèque iOS → photo → « Utiliser » : trois touchers du système, hors de l'app, non mesurables ici.
  await expect(page.getByRole("button", { name: "Remplacer", exact: true }).first()).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Prix du 80 ml", { exact: true }).fill("120");
  await taps.tap(page.getByRole("button", { name: "Ajouter au catalogue", exact: true }), "Ajouter au catalogue");

  await expect(page).toHaveURL(/\/admin\/catalogue\/parfums\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Sauvage Elixir" })).toBeVisible();
  const elapsed = Date.now() - started;
  testInfo.annotations.push({ type: "PC-07", description: `${taps.count} taps dans l'app (+ 3 du sélecteur de photos iOS), ${Math.round(elapsed / 1000)} s` });
  console.info(`PC-07 : ${taps.count} taps mesurés, ${Math.round(elapsed / 1000)} s`);

  // Visible d'emblée (visuel présent, Dior visible), tarif mémorisé, photo au stockage (faux, local).
  await expect(page.getByRole("switch", { name: /Visible sur la vitrine/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("80 ml", { exact: true })).toBeVisible();
  // Converti par le serveur (04 §12, décision du 17/09/2026) : un vrai WebP portrait, l'original temporaire supprimé.
  const created = (await storedKeys()).filter((key) => key.startsWith("catalog/perfumes/") && !perfumeKeysBefore.has(key));
  expect(created).toHaveLength(1);
  const [finalKey] = created as [string];
  expect(finalKey).toMatch(/^catalog\/perfumes\/\d{13}-[0-9a-f]{8}\.webp$/);
  expect(await storedImage(finalKey)).toEqual({ format: "webp", width: 1024, height: 1536, hasAlpha: false });
  const stampOf = /(\d{13}-[0-9a-f]{8})\.webp$/.exec(finalKey)?.[1] as string;
  await expect.poll(async () => (await storedKeys()).filter((key) => key.startsWith(`catalog/tmp/perfumes/${stampOf}.`))).toEqual([]);

  taps.expectAtMost(9);
  expect(elapsed).toBeLessThan(90_000);
});

test("visibilité basculée en 1 tap depuis la liste, et gardée au rechargement", async ({ page }) => {
  await openShell(page, routes.catalogue({ q: "yara" }));
  await waitForHydration(page.getByRole("button", { name: "Masquer Yara", exact: true }));
  const taps = countTaps(page);
  // L'œil bascule avant la réponse (optimiste) ; on attend l'écriture avant de recharger.
  const written = page.waitForResponse((response) => response.request().method() === "POST");
  await taps.tap(page.getByRole("button", { name: "Masquer Yara", exact: true }), "œil de Yara");
  await expect(page.getByRole("button", { name: "Rendre Yara visible", exact: true })).toHaveAttribute("aria-pressed", "false");
  await written;
  taps.expectAtMost(1);

  await page.reload();
  await waitForHydration(page.locator("[data-tabbar] a").first());
  const eye = page.getByRole("button", { name: "Rendre Yara visible", exact: true });
  await waitForHydration(eye);

  // Et retour : visible à nouveau, toujours en 1 tap.
  await eye.tap();
  await expect(page.getByRole("button", { name: "Masquer Yara", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("sans visuel : enregistré masqué, publication refusée avec le message du domaine, œil restauré", async ({ page }) => {
  const refusal = "Ajoute un visuel pour publier ce parfum.";
  await openShell(page, routes.nouveauParfum());
  await waitForHydration(page.getByRole("button", { name: "Choisir la marque", exact: true }).first());
  await page.getByRole("button", { name: "Choisir la marque", exact: true }).first().tap();
  await expect(drawer(page)).toBeVisible();
  await drawer(page).getByLabel("Rechercher une marque", { exact: true }).fill("chanel");
  await drawer(page).getByRole("button", { name: /^Chanel\b/ }).first().tap();
  await expect(drawer(page)).toBeHidden();
  await page.getByLabel("Nom du parfum", { exact: true }).fill("Égoïste");
  await page.getByLabel("Prix du 80 ml", { exact: true }).fill("95");
  await page.getByRole("button", { name: "Ajouter au catalogue", exact: true }).tap();

  // La notice part avec le succès de l'action, avant que E16 ne soit rendue : on l'attend d'abord (le toast
  // ne dure que trois secondes).
  await expect(
    page.locator("[data-admin-toast]").getByText("Égoïste ajouté, masqué : ajoute un visuel pour publier ce parfum."),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Égoïste" })).toBeVisible({ timeout: 30_000 });
  const visibility = page.getByRole("switch", { name: /Visible sur la vitrine/ });
  await expect(visibility).toHaveAttribute("aria-checked", "false");
  await expect(visibility).toHaveAttribute("aria-disabled", "true");
  await expect(visibility).toContainText(refusal);

  await openShell(page, routes.catalogue({ q: "egoiste" }));
  const eye = page.getByRole("button", { name: "Rendre Égoïste visible", exact: true });
  await waitForHydration(eye);
  await eye.tap();
  await expect(page.locator("[data-admin-toast]").getByText(refusal)).toBeVisible();
  await expect(page.getByRole("button", { name: "Rendre Égoïste visible", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("original illisible par le serveur : refusé dans le champ avec sa raison, et « Réessayer »", async ({ page }) => {
  await openShell(page, routes.nouveauParfum());
  const importer = page.getByRole("button", { name: "Importer", exact: true }).first();
  await waitForHydration(importer);
  const chooser = page.waitForEvent("filechooser");
  await importer.tap();
  await (await chooser).setFiles(await tiffNamedPng("scan.png"));

  // Le serveur convertit d'après les OCTETS, pas d'après l'extension : la raison remonte jusqu'au champ, et
  // « Réessayer » renvoie le même fichier. (Que l'original temporaire soit supprimé est éprouvé sur la base :
  // `tests/db/catalogue-media.test.ts`, « original illisible … original supprimé ».)
  await expect(page.getByText("Envoi impossible — format illisible")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Réessayer", exact: true })).toBeVisible();
});

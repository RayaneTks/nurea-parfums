import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { seedPerfumeId } from "../fixtures/seed";
import { waitForHydration } from "../helpers/hydration";
import { heic, png, storedKeys, unreadableHeic } from "../helpers/images";
import { countTaps } from "../helpers/tap";

/**
 * PC-13 — Visuels story d'un parfum (06 E16 zone 7 ; 05 §3.2 `MediaGallery` ; 07 J11) : dépôt de plusieurs
 * images dont un HEIC, un fichier illisible refusé sans arrêter les autres, ordre, libellé, partage natif
 * avec fichier (simulé) — feuille fermée = aucun téléchargement —, retrait qui supprime l'objet.
 */

const ASAD = seedPerfumeId("Asad");

type ShareProbe = { shares: { names: string[]; types: string[] }[]; downloads: string[]; abort: boolean };

/** `navigator.share` avec fichiers simulé (iOS) ; les téléchargements par lien `download` sont relevés. */
async function installShareProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: ShareProbe = { shares: [], downloads: [], abort: false };
    (window as unknown as { __probe: ShareProbe }).__probe = probe;
    Object.defineProperty(navigator, "canShare", { configurable: true, value: (data: { files?: File[] }) => Array.isArray(data?.files) });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { files?: File[] }) => {
        probe.shares.push({ names: (data.files ?? []).map((f) => f.name), types: (data.files ?? []).map((f) => f.type) });
        if (probe.abort) throw new DOMException("Feuille de partage fermée", "AbortError");
      },
    });
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      if (this.hasAttribute("download")) {
        probe.downloads.push(this.download);
        return;
      }
      click.call(this);
    };
  });
}

const probe = (page: Page) => page.evaluate(() => (window as unknown as { __probe: ShareProbe }).__probe);
const viewer = (page: Page) => page.locator("[data-media-viewer]");
const thumbnails = (page: Page) => page.getByRole("list", { name: "Visuels" }).locator("img");

async function thumbnailSources(page: Page): Promise<string[]> {
  return thumbnails(page).evaluateAll((images) => images.map((image) => (image as HTMLImageElement).getAttribute("src") ?? ""));
}

test("déposer, ranger, nommer, partager et retirer les visuels story d'un parfum", async ({ page }, testInfo) => {
  testInfo.setTimeout(180_000);
  await installShareProbe(page);
  await page.goto(routes.parfum(ASAD));
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await expect(page.getByRole("heading", { level: 1, name: "Asad" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Visuels story · 0" })).toBeVisible();
  await expect(page.getByText("Aucun visuel story", { exact: true })).toBeVisible();
  await waitForHydration(page.getByRole("button", { name: "Ajouter des visuels", exact: true }));

  // Dépôt de deux planches, dont une photo HEIC de l'iPhone.
  const [planche, photo] = await Promise.all([png("sauvage-story.png", 1080, 1920), heic("IMG_2207.HEIC", 1440, 2560)]);
  let chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Ajouter des visuels", exact: true }).tap();
  await (await chooser).setFiles([planche, photo]);
  await expect(page.locator("[data-admin-toast]").getByText("2 visuels ajoutés")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("heading", { level: 2, name: "Visuels story · 2" })).toBeVisible();
  await expect(thumbnails(page)).toHaveCount(2);
  const deposited = await thumbnailSources(page);
  const storyKeys = (await storedKeys()).filter((key) => key.startsWith(`catalog/stories/${ASAD}/`));
  expect(storyKeys).toHaveLength(2);

  // Un fichier illisible est refusé, avec sa raison, sans rien ajouter.
  const add = page.getByRole("button", { name: "Ajouter des visuels", exact: true });
  await expect(add).toBeEnabled();
  await waitForHydration(add);
  chooser = page.waitForEvent("filechooser");
  await add.tap();
  await (await chooser).setFiles([unreadableHeic("capture.heic")]);
  await expect(page.locator("[data-admin-toast]").getByText("Aucun visuel ajouté · 1 refusé : format illisible")).toBeVisible({ timeout: 30_000 });
  await expect(thumbnails(page)).toHaveCount(2);

  // Ordre : le premier passe après le second.
  await thumbnails(page).first().tap();
  await expect(viewer(page)).toBeVisible();
  await viewer(page).getByRole("button", { name: "Après", exact: true }).tap();
  await expect.poll(() => thumbnailSources(page)).toEqual([deposited[1], deposited[0]]);
  await viewer(page).getByRole("button", { name: "Fermer", exact: true }).tap();
  await expect(viewer(page)).toBeHidden();

  // Libellé libre.
  await thumbnails(page).first().tap();
  await viewer(page).getByRole("button", { name: "Modifier le libellé", exact: true }).tap();
  await viewer(page).getByLabel("Libellé du visuel", { exact: true }).fill("Fond clair");
  await viewer(page).getByRole("button", { name: "Enregistrer le libellé", exact: true }).tap();
  await expect(viewer(page).getByText("Fond clair", { exact: true })).toBeVisible();
  await viewer(page).getByRole("button", { name: "Fermer", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Ouvrir Fond clair", exact: true })).toBeVisible();

  // PC-13 : deux gestes sur la fiche — la vignette, puis « Partager / Enregistrer ».
  const taps = countTaps(page);
  await taps.tap(page.getByRole("button", { name: "Ouvrir Fond clair", exact: true }), "vignette");
  await taps.tap(viewer(page).getByRole("button", { name: "Partager / Enregistrer", exact: true }), "Partager / Enregistrer");
  await expect.poll(async () => (await probe(page)).shares.length).toBe(1);
  const [shared] = (await probe(page)).shares;
  expect(shared?.names).toHaveLength(1);
  expect(shared?.names[0]).toMatch(/^nurea-lattafa-asad-story-fond-clair\.(webp|jpg)$/);
  taps.expectAtMost(2);

  // Feuille de partage fermée (AbortError) : rien ne se passe, aucun téléchargement de repli.
  await page.evaluate(() => {
    (window as unknown as { __probe: ShareProbe }).__probe.abort = true;
  });
  await viewer(page).getByRole("button", { name: "Partager / Enregistrer", exact: true }).tap();
  await expect.poll(async () => (await probe(page)).shares.length).toBe(2);
  await expect(viewer(page).getByRole("button", { name: "Partager / Enregistrer", exact: true })).toBeEnabled();
  expect((await probe(page)).downloads).toEqual([]);
  await expect(viewer(page).locator('[role="alert"]')).toHaveCount(0);

  // Retrait : confirmation qui dit l'effet, vignette disparue, objet supprimé du stockage.
  await viewer(page).getByRole("button", { name: "Retirer", exact: true }).tap();
  const dialog = page.locator("[data-confirm-dialog]");
  await expect(dialog.getByRole("heading", { name: "Retirer ce visuel ?" })).toBeVisible();
  await expect(dialog).toContainText("Il est supprimé de la fiche et du stockage, sans retour possible.");
  await dialog.getByRole("button", { name: "Retirer", exact: true }).tap();
  await expect(page.locator("[data-admin-toast]").getByText("Visuel retiré")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 2, name: "Visuels story · 1" })).toBeVisible();
  await expect(thumbnails(page)).toHaveCount(1);
  await expect.poll(async () => (await storedKeys()).filter((key) => key.startsWith(`catalog/stories/${ASAD}/`)).length).toBe(1);

  // Les visuels story ne décident jamais de la visibilité du parfum.
  await expect(page.getByRole("switch", { name: /Visible sur la vitrine/ })).toHaveAttribute("aria-checked", "true");
});

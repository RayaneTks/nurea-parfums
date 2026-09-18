import { expect, test, type Locator, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { eurFromWire, formatEur, type MoneyString } from "../../src/domain/money";
import { DOCS } from "../fixtures/documents";
import { SEED } from "../fixtures/seed";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { actionSheet, documentSheet, euros, expectToast, openShell, tab, toast } from "./support-j8";

/**
 * Clients (07 J10 ; 06 PC-06, E12, E14, E20 ; 02 §2 tâche n°6) : le dû d'un client en 2 taps depuis l'Accueil, le
 * MÊME chiffre sur la liste, À encaisser, la fiche et en SQL ; la relance partageable en 2 taps de plus ; la
 * recherche « 06 12 », les initiales accentuées, « Afficher plus » qui ajoute et la recherche qui repart de la
 * première page ; la création avec un téléphone saisi « 06 12 34 56 78 » ; la suppression refusée avec sa raison,
 * puis acceptée, historique conservé sous le nom. Chaque geste est confronté à la base.
 */

const idOf = (fullName: string) => {
  const found = SEED.customers.find((customer) => customer.fullName === fullName);
  if (!found) throw new Error(`client.spec : « ${fullName} » absent du jeu.`);
  return found.id;
};

/** À encaisser d'une fiche, exécuté en SQL sur la vue (03 §5.3) : la référence des écrans. */
const dueInSql = (customerId: string) =>
  withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ due: string }[]>(
      `SELECT COALESCE(SUM(due), 0)::numeric(12,2)::text AS due FROM "DocumentBalance" WHERE "customerId" = $1 AND status IN ('CONFIRMED', 'DELIVERED')`,
      customerId,
    );
    return (row?.due ?? "0.00") as MoneyString;
  });

const customerRow = (scope: Page | Locator, fullName: string) => scope.locator("[data-customer-row]").filter({ hasText: fullName });

type ShareProbe = { texts: string[] };

/** Feuille de partage iOS simulée : le texte envoyé est relevé. */
async function installShareProbe(page: Page) {
  await page.addInitScript(() => {
    const probe: ShareProbe = { texts: [] };
    (window as unknown as { __share: ShareProbe }).__share = probe;
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { text?: string }) => {
        probe.texts.push(data.text ?? "");
      },
    });
  });
}

test("PC-06 : le dû d'un client en 2 taps depuis l'Accueil, la relance prête en 2 taps de plus", async ({ page }) => {
  await installShareProbe(page);
  const nora = idOf("Nora Belkacem");
  const due = await dueInSql(nora);
  expect(due).toBe("160.00");

  await openShell(page, routes.accueil());
  const taps = countTaps(page);
  await taps.tap(tab(page, "Clients"), "onglet Clients");
  const row = customerRow(page, "Nora Belkacem");
  await waitForHydration(row.getByRole("link"));
  await taps.tap(row.getByRole("link"), "Nora Belkacem");
  await expect(page).toHaveURL((url) => url.pathname === routes.client(nora));
  const tile = page.locator("[data-customer-due]");
  await expect(tile).toHaveAttribute("data-customer-due", due);
  await expect(tile).toContainText(formatEur(eurFromWire(due), { compact: true }));
  taps.expectAtMost(2);

  // La relance : S09, puis la feuille de partage — 2 taps de plus.
  const relancer = page.getByRole("button", { name: "Relancer", exact: true });
  await waitForHydration(relancer);
  await taps.tap(relancer, "Relancer");
  const sheet = actionSheet(page, "Relancer · Nora Belkacem");
  await expect(sheet.getByLabel("Message", { exact: true })).toHaveValue(/^Bonjour Nora Belkacem,/);
  await taps.tap(sheet.getByRole("button", { name: "Envoyer…" }), "Envoyer…");
  taps.expectAtMost(4);

  await expect.poll(() => page.evaluate(() => (window as unknown as { __share: ShareProbe }).__share.texts.length)).toBe(1);
  const [text] = await page.evaluate(() => (window as unknown as { __share: ShareProbe }).__share.texts);
  expect(text).toContain(`Total à régler : ${euros("160")}`);
  expect(text?.match(/restants/g)).toHaveLength(2);
});

test("même montant partout : badge de la liste = groupe d'À encaisser = tuile de la fiche = SQL, pour trois clients", async ({ page }, testInfo) => {
  // Trois clients × trois écrans : neuf chargements complets, d'où le délai élargi.
  testInfo.setTimeout(150_000);
  for (const fullName of ["Fares Benali", "Yanis Cherif", "Nora Belkacem"]) {
    const id = idOf(fullName);
    const due = await dueInSql(id);
    const amount = eurFromWire(due);
    expect(Number(due), `${fullName} doit de l'argent`).toBeGreaterThan(0);

    await openShell(page, routes.clients({ q: fullName.split(" ")[0] }));
    await expect(customerRow(page, fullName)).toContainText(`${formatEur(amount, { compact: true })} dû`);

    await openShell(page, routes.encaisser());
    // L'en-tête du groupe du client : son nom (lien vers la fiche) et son total.
    const group = page.locator("section").filter({ has: page.getByRole("link", { name: fullName, exact: true }) });
    await expect(group.locator(":scope > div").first()).toContainText(formatEur(amount));

    await openShell(page, routes.client(id));
    await expect(page.locator("[data-customer-due]")).toHaveAttribute("data-customer-due", due);
    await expect(page.locator("[data-customer-due]")).toContainText(formatEur(amount, { compact: true }));
  }
});

test("recherche « 06 12 », « Élise » sous « E », « Afficher plus » ajoute, une recherche repart de la première page", async ({ page }) => {
  await openShell(page, routes.clients());
  const search = page.getByLabel("Rechercher un client", { exact: true });
  await waitForHydration(search);

  // « Élise » est rangée sous sa lettre de base, pas sous « # ».
  const sectionE = page.locator("section").filter({ has: page.getByRole("heading", { name: "E", exact: true }) });
  await expect(customerRow(sectionE, "Élise Martin")).toHaveCount(1);
  await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "#", exact: true }) })).toHaveCount(0);

  // « Afficher plus » AJOUTE la page suivante : les premières fiches restent, les suivantes arrivent.
  const before = await page.locator("[data-customer-row]").count();
  expect(before).toBe(50);
  await page.getByRole("button", { name: "Afficher plus" }).tap();
  await expect(page).toHaveURL((url) => url.searchParams.get("pages") === "2");
  await expect.poll(() => page.locator("[data-customer-row]").count()).toBeGreaterThan(50);
  await expect(customerRow(page, "Élise Martin")).toHaveCount(1);

  // Après « Afficher plus », une recherche repart de la première page et trouve un client de la première page.
  await search.fill("06 12");
  await expect(page).toHaveURL((url) => url.searchParams.get("q") === "06 12" && !url.searchParams.has("pages"));
  // Fares est enregistré « +33 6 12 34 00 00 » ; son contact s'écrit à la française.
  await expect(customerRow(page, "Fares Benali")).toHaveCount(1);
  await expect(customerRow(page, "Fares Benali")).toContainText("06 12 34 00 00");
  await expect(customerRow(page, "Zoé Client 48")).toHaveCount(0);
  await expect(search).toBeFocused();
});

test("création : téléphone saisi « 06 12 34 56 78 », homonyme et numéro déjà pris dits avant l'envoi, fiche en E.164", async ({ page }) => {
  await openShell(page, routes.clients());
  const taps = countTaps(page);
  await taps.tap(page.getByRole("button", { name: "Nouveau", exact: true }), "Nouveau");
  await expect(page.getByRole("heading", { level: 1, name: "Nouveau client" })).toBeVisible();

  const name = page.getByRole("textbox", { name: "Nom", exact: true });
  const phone = page.getByLabel("Téléphone", { exact: true });
  await waitForHydration(phone);

  // Homonyme : le nom normalisé d'une fiche existante, alerte avant l'envoi.
  await name.fill("fares benali");
  await expect(page.locator("[data-homonym-alert]")).toContainText("Fares Benali existe déjà.");
  await expect(page.getByRole("button", { name: "Vérifier le doublon" })).toBeVisible();

  // Numéro déjà pris : le message du serveur, dit avant l'envoi, avec la fiche à ouvrir.
  await name.fill("Inès Laurent");
  await phone.fill("06 98 76 54 32");
  await expect(page.getByText("Ce numéro est déjà celui de Lina Haddad.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ouvrir sa fiche" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Corriger le téléphone" })).toBeVisible();

  // Le téléphone tel qu'on le dit : aperçu normalisé, fiche créée en E.164.
  await phone.fill("06 12 34 56 78");
  await expect(page.getByText("+33 6 12 34 56 78", { exact: true })).toBeVisible();
  await taps.tap(page.getByRole("button", { name: "Créer la fiche" }), "Créer la fiche");
  taps.expectAtMost(2);

  await expect(page).toHaveURL((url) => /^\/admin\/clients\/[^/]+$/.test(url.pathname) && url.pathname !== routes.clients());
  await expectToast(page, "Fiche créée");
  await expect(page.getByRole("button", { name: "Renommer le client : Inès Laurent" })).toBeVisible();
  const created = await withE2eDb((db) => db.customer.findFirst({ where: { fullName: "Inès Laurent" } }));
  expect(created?.phoneE164).toBe("+33612345678");
  expect(new URL(page.url()).pathname).toBe(routes.client(created?.id ?? ""));
  // Coordonnées affichées comme on les dit ; « Appeler » compose le numéro E.164.
  await expect(page.getByRole("link", { name: "Appeler" })).toHaveAttribute("href", "tel:+33612345678");
});

test("suppression : refusée avec sa raison tant qu'une commande est en cours, puis acceptée, historique conservé sous le nom", async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const rachid = idOf("Rachid Mansour");
  await openShell(page, routes.client(rachid));

  // Refus expliqué AVANT le geste : bouton désactivé, raison affichée (01 §4.10).
  const remove = page.getByRole("button", { name: "Supprimer le client" });
  await waitForHydration(remove);
  await expect(remove).toBeDisabled();
  await expect(page.locator("[data-delete-blocked]")).toHaveText("Impossible : 1 commande en cours. Livre-la ou annule-la d'abord.");

  // Livrer la commande depuis l'historique (S01) : la fiche client se met à jour sous la sheet.
  await page.locator(`[data-history-row="${DOCS.rachidOrder}"]`).getByRole("button").tap();
  const fiche = documentSheet(page);
  await waitForHydration(fiche.getByRole("radio", { name: "Livrée" }));
  await fiche.getByRole("radio", { name: "Livrée" }).tap();
  await expectToast(page, "Commande livrée");
  await fiche.getByRole("button", { name: "Fermer", exact: true }).tap();
  await expect(fiche).toBeHidden();
  await expect(remove).toBeEnabled();
  await expect(page.locator("[data-delete-blocked]")).toHaveCount(0);

  // Confirmation vraie : les documents sont conservés, un filet de 5 s.
  await remove.tap();
  const dialog = page.locator("[data-confirm-dialog]");
  await expect(dialog.getByRole("heading", { name: "Supprimer Rachid Mansour ?" })).toBeVisible();
  await expect(dialog.getByText("Ses 2 documents sont conservés et restent affichés sous son nom. Tu pourras annuler pendant 5 secondes.")).toBeVisible();
  await dialog.getByRole("button", { name: "Supprimer", exact: true }).tap();

  await expect(page).toHaveURL((url) => url.pathname === routes.clients());
  await expect(toast(page).filter({ hasText: "Fiche supprimée" })).toBeVisible();
  await expect(toast(page).getByRole("button", { name: "Annuler" })).toBeVisible();
  await expect(customerRow(page, "Rachid Mansour")).toHaveCount(0);
  // Pendant le filet, rien n'est encore écrit.
  expect(await withE2eDb((db) => db.customer.count({ where: { id: rachid } }))).toBe(1);

  // Après 5 s : fiche supprimée, documents conservés et détachés, sous son nom.
  await expect.poll(() => withE2eDb((db) => db.customer.count({ where: { id: rachid } })), { timeout: 15_000 }).toBe(0);
  const documents = await withE2eDb((db) =>
    db.saleDocument.findMany({ where: { id: { in: [DOCS.rachidOrder, DOCS.rachidSale] } }, orderBy: { id: "asc" }, select: { customerId: true, customerName: true } }),
  );
  expect(documents).toEqual([
    { customerId: null, customerName: "Rachid Mansour" },
    { customerId: null, customerName: "Rachid Mansour" },
  ]);
});

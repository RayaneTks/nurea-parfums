import { expect, test, type Locator, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { figurePeriodLabel } from "../../src/contracts/compta";
import { NEWS_SEEN_KEY, TOP_PERFUMES_HOME, TOP_PERFUMES_PAGE } from "../../src/contracts/stats";
import { OLD_RECEIVABLE_DAYS } from "../../src/domain/document-balance";
import { parisDayKey } from "../../src/domain/periods";
import { COMPTA_MONTH, EMPTY_DAY } from "../fixtures/compta";
import { chiffresCanoniques, shown } from "../helpers/chiffres";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { openShell } from "./support-j8";

/**
 * E01, E02 et E07 (06 E01, E02, E07 ; 07 J14) — l'écran d'atterrissage.
 *
 * Ce que ce parcours prouve, au-delà de « ça s'affiche » :
 *
 *  1. **Chaque rangée de « À faire » ouvre EXACTEMENT l'ensemble qu'elle compte** : le nombre affiché est
 *     comparé au nombre de lignes de l'écran ouvert, rangée par rangée. C'était le défaut de l'ancien Accueil
 *     (01 §4.6 : il comptait PENDING + READY et ouvrait READY seule).
 *  2. **Chaque chiffre affiché = sa requête canonique** de 03 §5, exécutée sur la base e2e.
 *  3. **Les budgets de taps** : bilan du jour 1 tap, compta du mois 1 tap, répartir 2 taps (PC-09, PC-11).
 *  4. **Aucun décalage de mise en page** à l'arrivée des données : le bloc Argent occupe la MÊME boîte
 *     pendant son squelette et après (01 §4.6 : l'ancien fallback rendait 3 tuiles pour 2).
 *
 * Les chiffres du mois en cours bougent pendant la suite (les parcours de J8 encaissent aujourd'hui) : les
 * confrontations au centime se font sur des mois où personne n'écrit (`e2e/fixtures/compta.ts`).
 */

/** Le témoin de la carte « Nouveautés » : l'Accueil se mesure sans elle, sauf le test qui la vise. */
async function newsSeen(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
}

/** Le montant affiché par `Money` (sans le texte du lecteur d'écran). */
async function money(scope: Locator): Promise<string> {
  return (await scope.locator("span[aria-hidden]").first().innerText()).trim();
}

const alertRow = (page: Page, kind: string) => page.locator(`[data-alert="${kind}"]`);

/** Le nombre de rangées d'une liste de commandes (toutes sections confondues), la liste rendue. */
async function orderRows(page: Page): Promise<number> {
  await expect(page.getByRole("heading", { level: 1, name: "Commandes" })).toBeVisible();
  await expect(page.locator("[data-order-row]").first()).toBeVisible();
  return page.locator("[data-order-row]").count();
}

/**
 * L'invariant central de E01, éprouvé SANS instantané préalable : on lit le nombre sur la rangée, on ouvre son
 * écran, on compte ses lignes. Les deux lectures se suivent dans la même session.
 *
 * Pourquoi pas la requête canonique ici : la suite tourne en parallèle et les autres parcours écrivent
 * AUJOURD'HUI (livraisons, encaissements, ajustements de stock) — un instantané pris au début du test ne
 * décrit plus l'écran une minute après. La confrontation canonique de ces compteurs est faite, elle, sur base
 * isolée par `tests/db/accueil.test.ts`, et ici sur les périodes passées (E02, E07) où personne n'écrit.
 */
test("E01 : chaque rangée de « À faire » ouvre exactement l'ensemble qu'elle compte", async ({ page }) => {
  await newsSeen(page);
  await openShell(page, routes.accueil());
  await expect(page.locator("[data-alerts]")).toBeVisible();

  /** Lit le nombre affiché par une rangée, ouvre son écran et rend le nombre de lignes trouvées. */
  async function openAndCount(kind: string, expectRows: (page: Page) => Promise<number>): Promise<void> {
    await openShell(page, routes.accueil());
    const row = alertRow(page, kind);
    if ((await row.count()) === 0) return; // L'alerte n'existe pas en ce moment : rien à faire, rien rendu.
    const shownCount = Number(await row.getAttribute("data-alert-count"));
    expect(shownCount, `« ${kind} » affiche un compte`).toBeGreaterThan(0);
    await row.click();
    expect(await expectRows(page), `« ${kind} » : lignes de l'écran ouvert = nombre affiché`).toBe(shownCount);
  }

  // « n commandes en retard » → la liste filtrée « En retard ».
  await openAndCount("retard", async (p) => {
    await expect(p).toHaveURL(new RegExp(`${routes.commandes({ filtre: "retard" }).replace("?", "\\?")}$`));
    return orderRows(p);
  });

  // « n clients à relancer » → À encaisser, filtre « Plus de 30 jours » : n GROUPES de clients (03 §5.8).
  await openAndCount("a-relancer", async (p) => {
    await expect(p.getByRole("heading", { level: 1, name: "À encaisser" })).toBeVisible();
    await expect(p.locator("[data-receivables]")).toBeVisible();
    return p.locator("[data-receivable-group]").count();
  });

  // « n documents au coût à compléter » → Compta période « Tout » + filtre.
  await openAndCount("cout-a-completer", async (p) => {
    await expect(p.getByRole("heading", { level: 1, name: "Compta" })).toBeVisible();
    await expect(p.locator("[data-period-documents]")).toBeVisible();
    return p.locator("[data-compta-document]").count();
  });

  // Rupture et stock bas : DEUX rangées distinctes, chacune ouvrant son seul filtre (06 §1.7).
  for (const [kind, stock] of [["rupture", "rupture"], ["stock-bas", "bas"]] as const) {
    await openAndCount(kind, async (p) => {
      await expect(p).toHaveURL(new RegExp(`stock=${stock}$`));
      await expect(p.locator("[data-perfume-row]").first()).toBeVisible();
      return p.locator("[data-perfume-row]").count();
    });
  }

  // Les deux alertes de stock ne se confondent jamais : elles ouvrent deux filtres différents.
  await openShell(page, routes.accueil());
  const rupture = alertRow(page, "rupture");
  const bas = alertRow(page, "stock-bas");
  if ((await rupture.count()) > 0 && (await bas.count()) > 0) {
    const href = async (row: Locator) => row.evaluate((el) => el.closest("a")?.getAttribute("href") ?? "");
    expect(await href(rupture)).not.toBe(await href(bas));
  }
});

/**
 * A-13 : UN seul Encaissé sur l'Accueil, daté du mois, et le MÊME nombre que sur son écran de référence.
 *
 * L'ancien Accueil affichait « Encaissé » (depuis toujours, ventes + commandes) à côté d'une tuile « Ce mois »
 * qui ne sommait que les ventes : deux chiffres voisins, deux périmètres, sous deux noms (01 §4.6). On vérifie
 * ici qu'il n'en reste qu'un, et qu'il dit la même chose que la Compta du même mois — lue dans la même session,
 * juste après le tap. La confrontation à la requête canonique se fait sur base isolée
 * (`tests/db/accueil.test.ts`) et, en e2e, sur les périodes passées (E02, E07).
 */
test("E01 : un seul Encaissé, daté du mois, et le même nombre que sur la Compta", async ({ page }) => {
  await newsSeen(page);
  await openShell(page, routes.accueil());

  const block = page.locator("[data-money-block]");
  await expect(block).toBeVisible();
  const mois = figurePeriodLabel("mois", null);

  await expect(block).toContainText(`Encaissé · ${mois}`);
  expect(await block.getByText(/^Encaissé/).count()).toBe(1);
  await expect(block).not.toContainText("Ce mois");
  await expect(block).toContainText(`Marge nette · ${mois}`);

  const tile = (label: string) => block.locator("a", { has: page.getByText(label, { exact: true }) }).first();
  // Trois tuiles : la dominante et deux secondaires. Chaque chiffre mène à l'écran qui le résout (05 §3.2).
  expect(await block.locator("a").count()).toBe(3);
  await expect(tile("À encaisser")).toHaveAttribute("href", routes.encaisser());
  await expect(tile("Trésorerie")).toHaveAttribute("href", routes.compta({ vue: "tresorerie" }));
  const encaisseTile = await money(tile(`Encaissé · ${mois}`));
  const dueTile = await money(tile("À encaisser"));

  // La Compta du même mois dit le même Encaissé (elle l'affiche avec ses centimes ; la tuile les masque
  // quand ils sont nuls — `Money compact`) et le même À encaisser.
  await tile(`Encaissé · ${mois}`).click();
  await expect(page.locator("[data-sales-figures]")).toBeVisible();
  const comptaEncaisse = await money(page.locator('[data-figure="encaisse"]'));
  expect(comptaEncaisse.replace(",00", "")).toBe(encaisseTile.replace(",00", ""));
  const comptaDue = page.locator('[data-figure="a-encaisser"]');
  if ((await comptaDue.count()) > 0) {
    expect((await money(comptaDue)).replace(",00", "")).toBe(dueTile.replace(",00", ""));
  }
});

test("PC-09 : le bilan du jour en 1 tap, la compta du mois en 1 tap", async ({ page }) => {
  await newsSeen(page);
  await openShell(page, routes.accueil());

  // Le récap du jour se LIT à 0 tap sur l'Accueil, et se détaille en 1.
  const today = page.locator("[data-today-block]");
  await expect(today).toBeVisible();
  await expect(today).toContainText("Aujourd'hui");

  const toE02 = countTaps(page);
  await toE02.tap(today.getByRole("link").first(), "en-tête Aujourd'hui");
  await expect(page).toHaveURL(new RegExp(`${routes.journee()}$`));
  await expect(page.locator("[data-day-recap]")).toBeVisible();
  toE02.expectAtMost(1);

  // La compta du mois : un tap sur la tuile « Encaissé · (mois) », période Mois d'emblée.
  await openShell(page, routes.accueil());
  const mois = figurePeriodLabel("mois", null);
  const toE03 = countTaps(page);
  const tile = page.locator("[data-money-block] a", { has: page.getByText(`Encaissé · ${mois}`, { exact: true }) }).first();
  await toE03.tap(tile, "tuile Encaissé");
  await expect(page.getByRole("heading", { level: 1, name: "Compta" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Période" }).getByRole("button", { name: "Mois" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-sales-figures]")).toContainText(`Encaissé · ${mois}`);
  toE03.expectAtMost(1);
});

/**
 * PC-11 — répartir depuis l'alerte en 2 taps, SANS quitter l'Accueil.
 *
 * Le deuxième tap (« Ranger … ») n'est pas pressé ici, à dessein : « Non attribué » est une poche **unique et
 * partagée** par toute la suite, et la vider ferait échouer `transfert.spec.ts`, qui éprouve le plancher de
 * cette poche (elle a besoin d'un solde non nul). Ce que ce test prouve donc : l'alerte existe, elle agit SUR
 * PLACE (aucune navigation), et après UN tap il ne reste qu'un geste — le CTA est visible, actif, et porte
 * déjà le montant entier et la poche par défaut (N2). L'écriture elle-même est éprouvée ailleurs :
 * `tests/db/transactions/t11-transfer.test.ts` (« Répartir le non attribué », plancher, idempotence,
 * atomicité) et `e2e/parcours/transfert.spec.ts` pour le geste complet dans S15.
 */
test("PC-11 : depuis l'alerte, il ne reste qu'un geste pour ranger le non attribué (2 taps)", async ({ page }) => {
  await newsSeen(page);
  await openShell(page, routes.accueil());

  const row = alertRow(page, "non-attribue");
  await expect(row).toBeVisible();
  await expect(row).toContainText("non attribués");

  const taps = countTaps(page);
  const repartir = page.locator("[data-alerts]").getByRole("button", { name: "Répartir", exact: true });
  await waitForHydration(repartir);
  await taps.tap(repartir, "Répartir");

  // La sheet se pose AU-DESSUS de l'Accueil : aucune navigation, l'écran reste celui du gérant.
  await expect(page).toHaveURL(new RegExp(`${routes.accueil()}$`));
  const sheet = page.locator('[data-vaul-drawer][data-state="open"]').last();
  await expect(sheet.locator("[data-movement-sheet]")).toBeVisible();

  // Montant = tout le non attribué, destination = la poche par défaut : il ne reste qu'à confirmer.
  const confirm = sheet.locator("[data-movement-cta]");
  await expect(confirm).toBeEnabled();
  await expect(confirm).toHaveText(/^Ranger .+ dans /);
  expect(taps.count + 1, "un tap fait, un geste restant : 2 taps").toBe(2);
});

test("E01 : le bloc Argent n'a pas bougé entre son squelette et son contenu", async ({ page }) => {
  await newsSeen(page);
  await page.goto(routes.accueil());
  await waitForHydration(page.locator("[data-tabbar] a").first());

  // Le squelette du bloc Argent est le fallback de SON `Suspense` : il occupe déjà la place définitive.
  const skeleton = page.getByLabel("Chargement des chiffres");
  const before = (await skeleton.count()) > 0 ? await skeleton.boundingBox() : null;

  const block = page.locator("[data-money-block]");
  await expect(block).toBeVisible();
  const after = await block.boundingBox();
  expect(after).not.toBeNull();

  if (before) {
    // Même origine et même largeur ; la hauteur ne varie pas de plus d'un pixel de sous-pixel.
    expect(Math.abs((after?.x ?? 0) - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs((after?.y ?? 0) - before.y)).toBeLessThanOrEqual(1);
    expect(Math.abs((after?.width ?? 0) - before.width)).toBeLessThanOrEqual(1);
    expect(Math.abs((after?.height ?? 0) - before.height)).toBeLessThanOrEqual(1);
  }

  // Trois tuiles, toujours : une dominante et deux secondaires (jamais 3 pour 2, bug 01 §4.6).
  expect(await block.locator("a").count()).toBe(3);
});

test("E01 : la carte « Nouveautés » explique les changements, puis se ferme définitivement", async ({ page }) => {
  await openShell(page, routes.accueil());
  const card = page.locator('[data-card="nouveautes"]');
  await expect(card).toBeVisible();
  // Les changements d'habitude tranchés (00-README « Décisions qui changent le quotidien »).
  await expect(card).toContainText("Clients a le sien");
  await expect(card).toContainText("Vente et commande");
  await expect(card).toContainText("Reçu maintenant");
  await expect(card).toContainText("non suivi");
  await expect(card).toContainText("une seule définition");

  const compris = card.getByRole("button", { name: "J'ai compris" });
  await waitForHydration(compris);
  await compris.tap();
  await expect(card).toHaveCount(0);

  // Elle ne revient pas, même après rechargement : la fermeture vit sur l'appareil.
  await page.reload();
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await expect(page.locator('[data-card="nouveautes"]')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), NEWS_SEEN_KEY)).toBe("1");
});

test("E02 : Encaissé du jour par poche = les chiffres canoniques ; le récap se partage", async ({ page }) => {
  const jour = COMPTA_MONTH.busyDay();
  const canonical = chiffresCanoniques("month", jour);
  await openShell(page, routes.journee({ jour }));

  const figures = page.locator("[data-day-figures]");
  await expect(figures).toBeVisible();
  expect(await money(figures)).toBe(shown(canonical.jour.encaisse));

  // Une ligne par poche à montant non nul, et leur somme EST le total (03 §5.2).
  const pockets = canonical.jour.parPoche.filter((poche) => poche.encaisse !== "0.00");
  for (const poche of pockets) {
    await expect(figures).toContainText(poche.name);
    await expect(figures).toContainText(shown(poche.encaisse));
  }

  // Les documents du jour sont exactement ceux que la requête compte.
  const rows = page.locator("[data-day-document] a");
  await expect(rows.first()).toBeVisible();
  const hrefs = await rows.evaluateAll((nodes) => nodes.map((node) => new URL((node as HTMLAnchorElement).href).searchParams.get("doc")));
  expect(new Set(hrefs.filter(Boolean))).toEqual(new Set(canonical.jour.documents));

  // « Partager le récap » est là, et la fiche d'un document s'ouvre AU-DESSUS du récap (`?doc=`, A-3).
  await expect(page.getByRole("button", { name: "Partager le récap" })).toBeVisible();
  await rows.first().click();
  await expect(page.locator("[data-document-sheet]")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/admin/journee");
});

test("E02 : un jour sans rien se dit en une ligne calme, sans bouton de partage", async ({ page }) => {
  await openShell(page, routes.journee({ jour: EMPTY_DAY() }));
  await expect(page.getByText("Rien d'enregistré ce jour-là.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Partager le récap" })).toHaveCount(0);
  await expect(page.locator("[data-day-figures]")).toHaveCount(0);
});

test("E02 : le navigateur de date recule, et n'avance pas au-delà d'aujourd'hui", async ({ page }) => {
  await openShell(page, routes.journee());
  const next = page.getByRole("link", { name: "Jour suivant" });
  await expect(next).toHaveCount(0);

  await page.getByRole("link", { name: "Jour précédent" }).click();
  await expect(page.locator("[data-day-recap]")).toBeVisible();
  await expect(page.getByRole("link", { name: "Jour suivant" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("jour")).not.toBe(parisDayKey());
});

test("E07 : le classement est en unités, = la requête canonique, et « Afficher plus » ajoute une page", async ({ page }) => {
  const ref = COMPTA_MONTH.ref();
  const canonical = chiffresCanoniques(`month@${ref}`);
  await openShell(page, routes.statistiques({ ref }));

  const list = page.locator("[data-classement]");
  await expect(list).toBeVisible();
  // Sous-titre en flacons, jamais un montant (06 E07 : « aucun montant sommé hors du vocabulaire canonique »).
  await expect(page.getByText(`${canonical.classement.totalUnits} flacon`, { exact: false })).toBeVisible();
  await expect(list).not.toContainText("€");

  await expect(list.locator("[data-classement-row]").first()).toBeVisible();
  expect(await list.locator("[data-classement-row]").count()).toBe(
    Math.min(canonical.classement.totalEntries, TOP_PERFUMES_PAGE),
  );
  for (const entry of canonical.classement.entries.slice(0, TOP_PERFUMES_PAGE)) {
    await expect(list).toContainText(entry.name);
    await expect(list).toContainText(`${entry.units} flacon${entry.units > 1 ? "s" : ""}`);
  }

  // « Afficher plus » n'existe que s'il reste des lignes.
  const more = page.getByRole("button", { name: "Afficher plus" });
  if (canonical.classement.totalEntries > TOP_PERFUMES_PAGE) {
    await waitForHydration(more);
    await more.tap();
    await expect(page).toHaveURL(/pages=2/);
  } else {
    await expect(more).toHaveCount(0);
  }
});

test("E07 : une période sans vente le dit, sans inventer de zéro", async ({ page }) => {
  await openShell(page, routes.statistiques({ periode: "jour", ref: EMPTY_DAY() }));
  await expect(page.getByText("Aucune vente sur cette période.")).toBeVisible();
  await expect(page.locator("[data-classement]")).toHaveCount(0);
});

test("E01 : « Top parfums » du mois mène au classement complet", async ({ page }) => {
  await newsSeen(page);
  await openShell(page, routes.accueil());
  const top = page.locator("[data-top-perfumes]");
  if ((await top.count()) === 0) {
    // Aucune vente ce mois-ci : le bloc n'existe pas (06 E01 zone 8) — c'est l'invariant à vérifier.
    expect(chiffresCanoniques("month").classement.totalEntries).toBe(0);
    return;
  }
  await expect(top).toContainText(`Top parfums · ${figurePeriodLabel("mois", null)}`);
  expect(await top.locator("[data-classement-row]").count()).toBeLessThanOrEqual(TOP_PERFUMES_HOME);
  // L'en-tête du bloc EST le lien « Tout le classement » (05 §3.2) : un seul chemin visible vers E07.
  await top.getByRole("heading", { level: 2 }).getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Statistiques" })).toBeVisible();
});

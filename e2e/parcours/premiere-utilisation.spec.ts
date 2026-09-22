import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { NEWS_SEEN_KEY } from "../../src/contracts/stats";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { openShell, tab } from "./support-j8";
import { chrono, composer, confirmationCard, cta, euros, openSheet } from "./support-j9";

/**
 * PC-12 — Première utilisation (06 PC-12 ; 07 §3.5 et §6.4).
 *
 * Objectif du parcours, décidé en 06 : **une première vente en moins de cinq minutes** après la
 * première connexion, sans aide extérieure. C'est le défaut nommé par l'audit (01 §4.6) : l'ancien
 * tableau de bord, sans données, rendait un écran de zéros qui n'orientait vers rien.
 *
 * Ce parcours est le SEUL à exiger une base vide : le jeu partagé de `e2e/fixtures/seed.ts` porte des
 * poches, des parfums et des documents, et `isFirstRun()` y est faux pour toujours. Il tourne donc sur
 * son propre harnais — base `nurea_test_e2e_vide`, ports 3102 et 3103, aucun seed —, lancé par
 * `npm run test:e2e:premiere` (`e2e/support/lancer-premiere.mjs`, projet `Mobile-premiere`).
 *
 * Ce qu'il prouve, au-delà de « la carte s'affiche » :
 *
 *  1. sur une base vide, l'Accueil ne rend QUE « Pour commencer » — pas une grille de zéros ;
 *  2. chacune des trois étapes mène à l'écran qui la fait, et rien n'y manque : la première poche est
 *     pré-remplie « Espèces », la seconde « Banque » ; la marque se crée DANS la sheet du parfum
 *     (aucune marque n'existe encore) ; la vente se fait sans client, pour un client de passage ;
 *  3. chaque étape se coche toute seule au retour sur l'Accueil, et la carte disparaît à la troisième ;
 *  4. la première vente est enregistrée en moins de cinq minutes, chronomètre en main.
 *
 * Le chronomètre tourne en `next dev` : il porte la compilation à la volée de chaque écran visité pour
 * la première fois. Il majore donc largement le temps réel — un dépassement se lit comme tel.
 */

const CINQ_MINUTES_S = 300;

/** La marque et le parfum créés par le parcours : rien n'existe en base, tout est fabriqué ici. */
const MARQUE = { saisie: "lattafa", enregistree: "Lattafa" };
const PARFUM = { saisie: "asad", enregistre: "Asad", prix80: "120" };

const carte = (page: Page) => page.locator('[data-card="pour-commencer"]');
/** Une étape qui reste à faire : une rangée cliquable, dont le nom accessible est le libellé. */
const etape = (page: Page, nom: string) => carte(page).getByRole("link", { name: nom, exact: true });
/**
 * Les étapes cochées. `exact` est indispensable : la recherche par texte de Playwright est
 * insensible à la casse, et « Fait » se retrouverait dans « Chacune se coche quand tu l'as faite. ».
 */
const faites = (page: Page) => carte(page).getByText("Fait", { exact: true });

/**
 * Retour à l'Accueil par l'onglet. En `next dev`, l'indicateur des outils de Next recouvre le PREMIER
 * onglet : le clic lui est remis directement, comme dans `commande-acompte-livraison.spec.ts`. Le geste
 * reste un tap pour le gérant — il se compte donc à part (`horsCompteur`).
 */
async function retourAccueil(page: Page): Promise<void> {
  await expect(async () => {
    await tab(page, "Accueil").dispatchEvent("click");
    await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
}

/**
 * Le témoin de la carte « Nouveautés » : elle passe AVANT « Pour commencer » (06 E01 zone 2, une seule
 * carte à la fois). Sans ce témoin, le vide de départ ne s'affiche jamais.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
});

test("PC-12 : première vente en moins de cinq minutes, en suivant « Pour commencer »", async ({ page }, testInfo) => {
  // Trois écrans compilés à la volée, un formulaire et une vente : le budget du parcours est en minutes.
  test.setTimeout(6 * 60_000);

  const taps = countTaps(page);
  /** Les taps que `TapCounter` ne peut pas jouer lui-même (voir `retourAccueil`). */
  let horsCompteur = 0;
  const stop = chrono(testInfo, "PC-12 première utilisation");

  // ── 0. L'Accueil d'une base vide ────────────────────────────────────────────────────────────────
  await openShell(page, routes.accueil());
  await expect(carte(page)).toBeVisible();
  await expect(carte(page).getByRole("heading", { name: "Pour commencer" })).toBeVisible();
  // Rien d'autre : pas de tuile d'argent, pas de « Aujourd'hui », pas d'alerte (05 §5.1).
  await expect(page.getByText("Encaissé", { exact: false })).toHaveCount(0);
  await expect(faites(page)).toHaveCount(0);
  for (const nom of ["Créer tes poches", "Ajouter un parfum", "Faire une vente"]) {
    await expect(etape(page, nom)).toBeVisible();
  }

  // ── 1. « Créer tes poches » → S16, Espèces puis Banque ───────────────────────────────────────────
  await taps.tap(etape(page, "Créer tes poches"), "étape « Créer tes poches »");
  await expect(page).toHaveURL(/\/admin\/compta\?vue=tresorerie$/);
  // Vide de départ de la Trésorerie : l'action est nommée, pas un tableau à zéro.
  await expect(page.getByText("Crée ta première poche")).toBeVisible();
  const ouvrirPoche = page.getByRole("button", { name: "Nouvelle poche", exact: true });
  await waitForHydration(ouvrirPoche);

  await taps.tap(ouvrirPoche, "Nouvelle poche");
  const pocheSheet = openSheet(page);
  await expect(pocheSheet.getByLabel("Nom de la poche", { exact: true })).toHaveValue("Espèces");
  await expect(pocheSheet.getByRole("button", { name: "Espèces", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Première poche : elle est proposée par défaut d'elle-même — l'interrupteur est déjà mis.
  await expect(pocheSheet.getByRole("switch", { name: "Proposer par défaut" })).toHaveAttribute("aria-checked", "true");
  await taps.tap(pocheSheet.getByRole("button", { name: "Créer la poche", exact: true }), "Créer la poche (Espèces)");
  await expect(pocheSheet).toBeHidden();

  // « Banque » en un tap depuis le même écran : la sheet se rouvre pré-remplie sur la poche qui manque.
  const rouvrirPoche = page.getByRole("button", { name: "Nouvelle poche", exact: true });
  await waitForHydration(rouvrirPoche);
  await taps.tap(rouvrirPoche, "Nouvelle poche (Banque)");
  const banqueSheet = openSheet(page);
  await expect(banqueSheet.getByLabel("Nom de la poche", { exact: true })).toHaveValue("Banque");
  await expect(banqueSheet.getByRole("button", { name: "Banque", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Une poche par défaut existe déjà : la seconde ne la remplace pas en douce.
  await expect(banqueSheet.getByRole("switch", { name: "Proposer par défaut" })).toHaveAttribute("aria-checked", "false");
  await taps.tap(banqueSheet.getByRole("button", { name: "Créer la poche", exact: true }), "Créer la poche (Banque)");
  await expect(banqueSheet).toBeHidden();

  // Retour sur l'Accueil : la première étape s'est cochée toute seule.
  await retourAccueil(page);
  horsCompteur += 1;
  await expect(carte(page)).toBeVisible();
  await expect(faites(page)).toHaveCount(1);
  await expect(etape(page, "Créer tes poches")).toHaveCount(0);

  // ── 2. « Ajouter un parfum » → E19, marque créée dans la sheet ───────────────────────────────────
  await taps.tap(etape(page, "Ajouter un parfum"), "étape « Ajouter un parfum »");
  await expect(page).toHaveURL(/\/admin\/catalogue\/parfums\/nouveau$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nouveau parfum" })).toBeVisible();

  const choisirMarque = page.getByRole("button", { name: "Choisir la marque", exact: true }).first();
  await waitForHydration(choisirMarque);
  await taps.tap(choisirMarque, "rangée Marque");
  const marqueSheet = openSheet(page);
  // Aucune marque au catalogue : la sheet le dit, et propose de créer celle qu'on tape.
  await expect(marqueSheet.getByText("Aucune marque au catalogue")).toBeVisible();
  await marqueSheet.getByLabel("Rechercher une marque", { exact: true }).fill(MARQUE.saisie);
  const creerMarque = marqueSheet.getByRole("button", { name: /^Créer la marque/ }).first();
  await waitForHydration(creerMarque);
  await taps.tap(creerMarque, "Créer la marque");
  await expect(marqueSheet.getByText(MARQUE.enregistree, { exact: false }).first()).toBeVisible();
  await taps.tap(marqueSheet.getByRole("button", { name: "Utiliser cette marque", exact: true }), "Utiliser cette marque");
  await expect(marqueSheet).toBeHidden();

  await page.getByLabel("Nom du parfum", { exact: true }).fill(PARFUM.saisie);
  await expect(page.getByText(`Sera enregistré : ${PARFUM.enregistre}`)).toBeVisible();
  await page.getByLabel("Prix du 80 ml", { exact: true }).fill(PARFUM.prix80);

  await taps.tap(page.getByRole("button", { name: "Ajouter au catalogue", exact: true }), "Ajouter au catalogue");
  await expect(page).toHaveURL(/\/admin\/catalogue\/parfums\/\d+$/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1, name: PARFUM.enregistre })).toBeVisible();
  // Sans visuel, le parfum reste masqué sur la vitrine — et reste vendable en gestion (02 §4.5).
  await expect(page.locator("[data-admin-toast]").getByText(/masqué/)).toBeVisible();

  await retourAccueil(page);
  horsCompteur += 1;
  await expect(faites(page)).toHaveCount(2);
  await expect(etape(page, "Ajouter un parfum")).toHaveCount(0);

  // ── 3. « Faire une vente » → E11, client de passage, tout reçu ───────────────────────────────────
  await taps.tap(etape(page, "Faire une vente"), "étape « Faire une vente »");
  await expect(page).toHaveURL(/\/admin\/vendre$/);
  await expect(composer(page)).toBeVisible();
  const chercherParfum = page.getByRole("button", { name: "Rechercher un parfum", exact: true });
  await waitForHydration(chercherParfum);

  await taps.tap(chercherParfum, "Rechercher un parfum");
  const parfumSheet = openSheet(page);
  // Aucune vente passée : le catalogue entier est listé d'emblée, rien à taper.
  const resultat = parfumSheet.getByRole("button", { name: new RegExp(`^${PARFUM.enregistre}`) }).first();
  await waitForHydration(resultat);
  await taps.tap(resultat, PARFUM.enregistre);
  await expect(parfumSheet).toBeHidden();

  // Le prix vient du tarif saisi à l'étape 2 : rien à ressaisir. 80 ml par défaut (03, contenances réelles).
  await expect(page.getByLabel(`Prix de ${PARFUM.enregistre}`, { exact: true })).toHaveValue(PARFUM.prix80);
  // « Reçu maintenant » est pré-rempli du total : une vente payée comptant ne demande aucune saisie.
  await expect(page.getByLabel("Reçu maintenant", { exact: true })).toHaveValue(PARFUM.prix80);
  // La poche par défaut est celle créée en premier.
  await expect(page.getByRole("button", { name: "Espèces", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(cta(page)).toContainText(`Encaisser ${euros(PARFUM.prix80)} · Espèces`);

  await taps.tap(cta(page), "Encaisser");
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  const secondes = stop(taps.count + horsCompteur);

  // ── Le compte y est, et la carte a disparu ───────────────────────────────────────────────────────
  expect(secondes, `PC-12 doit tenir en moins de ${CINQ_MINUTES_S} s (06 PC-12)`).toBeLessThan(CINQ_MINUTES_S);

  for (const nom of ["Voir", "Reçu", "Annuler"]) {
    await expect(confirmationCard(page).getByRole("button", { name: nom, exact: true })).toBeVisible();
  }

  await openShell(page, routes.accueil());
  // Les trois étapes faites : la carte s'efface d'elle-même, il n'y a rien à fermer (06 PC-12).
  await expect(carte(page)).toHaveCount(0);
  // Et l'Accueil est désormais l'Accueil : le bloc Argent a pris la place de la carte, et il porte
  // la vente qu'on vient de faire.
  // Le montant est lu dans le nom accessible (`spokenEur`) : la tuile, elle, écrit « 120 € » sans les
  // centimes nuls (05 §2.2, affichage compact) — deux textes pour un seul montant.
  await expect(page.getByRole("link", { name: /^Encaissé · .*120 euros/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Trésorerie 120 euros$/ })).toBeVisible();

  const compte = await withE2eDb(async (db) => ({
    poches: await db.pocket.count({ where: { isSystem: false } }),
    marques: await db.brand.count(),
    parfums: await db.perfume.count(),
    documents: await db.saleDocument.count(),
    paiements: await db.payment.count(),
  }));
  expect(compte).toEqual({ poches: 2, marques: 1, parfums: 1, documents: 1, paiements: 1 });
});

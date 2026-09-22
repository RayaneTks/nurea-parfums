import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { NEWS_SEEN_KEY } from "../../src/contracts/stats";
import { waitForHydration } from "../helpers/hydration";

/**
 * PWA de la gestion (04 §14, 06 E01 zone 2 et E09 ; 07 J16).
 *
 * Trois choses que seul un vrai navigateur peut dire :
 *  - `/admin-sw.js` est servi, public, et son script ne touche pas `/api/` ;
 *  - `/admin-offline.html` s'affiche SANS session et sans redirection vers la connexion — c'est tout
 *    l'intérêt de l'avoir sortie du matcher de `proxy.ts` (01 §4.7) ;
 *  - la carte d'installation apparaît dans le flux de l'Accueil, dans ses deux modes, et se ferme
 *    pour de bon.
 *
 * L'enregistrement du service worker lui-même n'est pas éprouvé ici : il est volontairement inactif
 * hors production (`ServiceWorkerRegistrar`), et un worker installé servirait des bundles périmés à
 * la suite entière. Le comportement du script, lui, est éprouvé par son test unitaire.
 */

/** Safari iOS : le seul navigateur de l'iPhone qui sache « Sur l'écran d'accueil ». */
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

/**
 * Safari iOS se reconnaît à `navigator.standalone` — une propriété que le Chromium des tests n'a pas,
 * même quand il emprunte l'agent utilisateur d'un iPhone (projet « Mobile »). On pose les deux.
 */
async function pretendIosSafari(page: Page): Promise<void> {
  await page.addInitScript((ua) => {
    Object.defineProperty(navigator, "userAgent", { get: () => ua });
    Object.defineProperty(navigator, "standalone", { get: () => false, configurable: true });
  }, IPHONE_UA);
}

/** La carte « Nouveautés » a sa propre mesure ; on la ferme pour voir celle qui nous intéresse. */
async function newsSeen(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
}

/** L'invite que Chrome émet quand l'app est installable ; le navigateur de test ne l'émet jamais seul. */
async function fireInstallPrompt(page: Page): Promise<void> {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt") as Event & {
      prompt?: () => Promise<void>;
      userChoice?: Promise<{ outcome: string }>;
    };
    event.prompt = async () => undefined;
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(event);
  });
}

const installCard = (page: Page) => page.locator('[data-card="installation"]');

test.describe("service worker et page hors ligne", () => {
  test("/admin-sw.js est servi en clair, versionné, et n'a aucune règle pour /api/", async ({ request }) => {
    const response = await request.get("/admin-sw.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/javascript");
    expect(response.headers()["cache-control"]).toContain("no-cache");

    const script = await response.text();
    // La politique, telle que le script la porte (le détail est éprouvé par le test unitaire).
    expect(script).toContain('url.pathname.indexOf("/api/") === 0');
    expect(script).toContain("/admin-offline.html");
    // La nouvelle version ATTEND : `skipWaiting` n'est appelé que sur le message du registrar.
    const installHandler = script.slice(script.indexOf('addEventListener("install"'), script.indexOf('addEventListener("activate"'));
    expect(installHandler).not.toContain("skipWaiting");
    expect(script).toContain('event.data === "skip-waiting"');
    expect(() => new Function(script)).not.toThrow();
  });

  test("/admin-offline.html s'affiche sans session, sans redirection vers la connexion", async ({ browser }) => {
    // Contexte NEUF, sans le `storageState` du gérant : c'est le cas du pré-cache à l'installation.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const response = await page.goto("/admin-offline.html");

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/admin-offline.html");
    await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    // Sans brouillon, la page ne promet rien.
    await expect(page.getByText("Ton ticket en cours est gardé sur ce téléphone.")).toBeHidden();
    await context.close();
  });

  test("avec un ticket en cours, la page hors ligne le dit (06 E09)", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("nurea:brouillon:vendre", JSON.stringify({ v: 1, savedAt: Date.now(), value: { lignes: 1 } }));
    });
    await page.goto("/admin-offline.html");
    await expect(page.getByText("Ton ticket en cours est gardé sur ce téléphone.")).toBeVisible();
    await context.close();
  });
});

test.describe("carte d'installation dans le flux de l'Accueil (06 E01 zone 2)", () => {
  test("Safari iOS : la consigne de partage, et rien d'autre", async ({ page }) => {
    await pretendIosSafari(page);
    await newsSeen(page);
    await page.goto(routes.accueil());
    await waitForHydration(page.locator("[data-tabbar] a").first());

    await expect(installCard(page)).toBeVisible();
    await expect(installCard(page).getByRole("heading", { name: "Installer l'app" })).toBeVisible();
    await expect(installCard(page).getByText("Touche « Partager » en bas de Safari.")).toBeVisible();
    // Une seule carte à la fois : « Pour commencer » ne s'affiche pas sous elle.
    await expect(page.locator('[data-card="pour-commencer"]')).toHaveCount(0);
    // Pas de bouton « Installer » : sur iOS, aucune invite n'existe — le proposer serait mentir.
    await expect(installCard(page).getByRole("button", { name: "Installer", exact: true })).toHaveCount(0);
  });

  test("ailleurs : le bouton « Installer », posé par beforeinstallprompt", async ({ page }) => {
    await newsSeen(page);
    await page.goto(routes.accueil());
    await waitForHydration(page.locator("[data-tabbar] a").first());
    // Sans invite du navigateur et sans Safari iOS, aucune carte : on ne propose pas une installation
    // qu'on ne saurait pas expliquer. (Le projet « Mobile » emprunte l'agent d'un iPhone, mais pas
    // `navigator.standalone` : la détection ne s'y trompe pas.)
    await expect(installCard(page)).toHaveCount(0);

    await fireInstallPrompt(page);
    await expect(installCard(page).getByRole("button", { name: "Installer", exact: true })).toBeVisible();
  });

  test("« Ne plus proposer » ferme la carte pour de bon sur cet appareil", async ({ page }) => {
    await pretendIosSafari(page);
    await newsSeen(page);
    await page.goto(routes.accueil());
    await waitForHydration(page.locator("[data-tabbar] a").first());
    await expect(installCard(page)).toBeVisible();

    await installCard(page).getByRole("button", { name: "Ne plus proposer" }).tap();
    await expect(installCard(page)).toHaveCount(0);

    // Elle ne revient pas — ni maintenant, ni au prochain lancement.
    await page.reload();
    await waitForHydration(page.locator("[data-tabbar] a").first());
    await expect(installCard(page)).toHaveCount(0);
  });
});

import { test, expect, type Page } from "@playwright/test";
import { installAdminSession } from "./helpers/adminSession";

/**
 * Changer le statut d'une commande ne doit jamais être refusé.
 *
 * Ce que ce test protège : l'écran affiche « En attente / À traiter / Livrée »
 * côte à côte, et l'outil doit obéir. La version précédente exigeait un acompte
 * pour quitter « en attente » et le solde entier pour livrer — une commande
 * offerte, à 0 €, restait donc coincée en attente, sans recours, et le patron
 * était bloqué par son propre logiciel.
 *
 * AUCUNE ÉCRITURE N'ATTEINT LA BASE. La fiche commande est rendue côté serveur
 * depuis Prisma : le test lit donc de vraies commandes, mais la requête PATCH
 * est interceptée et satisfaite localement. Tout le chemin est éprouvé, du clic
 * à l'appel réseau, sans toucher aux données de la boutique.
 *
 * On ouvre délibérément une commande AVEC solde dû. C'est le seul moyen de
 * rendre le test déterministe : sur une commande soldée, passer en « livrée »
 * ne soulève aucune réserve et s'applique sans dialogue — ce qui est le bon
 * comportement, mais ne prouve rien sur les réserves.
 */

type Interception = { appels: { statut: string }[] };

async function interceptePatch(page: Page, ordreId: string): Promise<Interception> {
  const journal: Interception = { appels: [] };
  await page.route(`**/api/admin/orders/${ordreId}`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const corps = route.request().postDataJSON() as { status?: string };
    journal.appels.push({ statut: corps.status ?? "?" });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ order: { id: ordreId, status: corps.status } }),
    });
  });
  return journal;
}

/**
 * Ouvre une commande dont il reste quelque chose à encaisser.
 *
 * La liste affiche « à encaisser » sur ces lignes-là : c'est le repère le plus
 * stable, il ne dépend d'aucun identifiant figé dans le test.
 */
async function ouvreCommandeAvecSolde(page: Page): Promise<string | null> {
  const res = await page.goto("/admin/ordres", { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) return null;

  // « /admin/ordres/new » partage le préfixe mais mène au formulaire de
  // création, qui ne porte aucun contrôle de statut.
  const lignes = page.locator('a[href^="/admin/ordres/"]:not([href="/admin/ordres/new"])');
  const total = await lignes.count();
  for (let i = 0; i < total; i++) {
    const ligne = lignes.nth(i);
    if ((await ligne.getByText(/à encaisser/i).count()) === 0) continue;
    const href = await ligne.getAttribute("href");
    const id = href?.split("/").pop();
    if (!id) continue;
    await ligne.click();
    await page.waitForURL(`**/admin/ordres/${id}`);
    return id;
  }
  return null;
}

function controleStatut(page: Page) {
  return page.getByRole("radiogroup", { name: /changer le statut/i });
}

test.describe("Statut de commande — jamais bloqué", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const ok = await installAdminSession(context, baseURL ?? "http://localhost:3000");
    test.skip(!ok, "ADMIN_JWT_SECRET absent de l'environnement.");
  });

  test("livrer avec un solde dû demande confirmation, et n'oppose aucun refus", async ({
    page,
  }) => {
    const id = await ouvreCommandeAvecSolde(page);
    test.skip(!id, "Aucune commande avec solde dû en base.");

    const journal = await interceptePatch(page, id!);
    const controle = controleStatut(page);
    await expect(controle).toBeVisible();

    await controle.getByRole("radio", { name: "Livrée" }).click();

    /*
     * Le cœur du test : une boîte de confirmation, PAS un bandeau d'erreur.
     * L'ancienne version répondait « Solde dû … € — encaisse avant livraison »
     * et ne changeait rien.
     */
    const dialogue = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(dialogue).toBeVisible();
    await expect(dialogue).toContainText(/à encaisser/i);
    await expect(page.getByText(/encaisse avant livraison|acompte requis/i)).toHaveCount(0);

    await dialogue.getByRole("button", { name: /confirmer/i }).click();

    // L'écriture a bien été tentée — et interceptée avant la base.
    await expect.poll(() => journal.appels.map((a) => a.statut)).toContain("DELIVERED");
  });

  test("renoncer à la confirmation n'écrit rien", async ({ page }) => {
    const id = await ouvreCommandeAvecSolde(page);
    test.skip(!id, "Aucune commande avec solde dû en base.");

    const journal = await interceptePatch(page, id!);
    await expect(controleStatut(page)).toBeVisible();

    await controleStatut(page).getByRole("radio", { name: "Livrée" }).click();

    const dialogue = page.getByRole("alertdialog").or(page.getByRole("dialog"));
    await expect(dialogue).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(dialogue).toBeHidden();
    expect(journal.appels).toHaveLength(0);
  });
});

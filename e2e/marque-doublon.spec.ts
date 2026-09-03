import { test, expect, type Page } from "@playwright/test";
import { installAdminSession } from "./helpers/adminSession";

/**
 * Le sélecteur de marque ne doit pas fabriquer de doublons.
 *
 * Ce que ces tests protègent, en une phrase : taper une marque qui existe déjà
 * doit la TROUVER, pas proposer de la créer une deuxième fois.
 *
 * Le défaut d'origine tenait en une ligne. Le filtre comparait
 * `b.name.toLowerCase().includes(q)` : la casse était bien ignorée, les accents
 * non. Taper « lancome » ne trouvait donc pas « Lancôme », l'écran n'affichait
 * aucun résultat, et la seule action offerte était « Créer la marque ». Côté
 * serveur, la recherche se faisait avec `where: { name }`, une égalité exacte,
 * qui laissait passer la création. Deux marques pour une maison, chacune
 * portant une partie des parfums.
 *
 * On éprouve les deux sens, parce qu'un test qui ne sait dire que « oui » ne
 * prouve rien : le contrôle négatif vérifie qu'une marque réellement absente
 * fait bien apparaître le bouton de création. Sans lui, une popover cassée qui
 * n'afficherait jamais ce bouton rendrait les autres cas verts.
 */

/** Marques présentes au catalogue, choisies pour ce qu'elles piègent. */
const CAS = [
  {
    saisie: "louis vuitton",
    attendu: "Louis Vuitton",
    piege: "casse seule",
  },
  {
    saisie: "LOUIS VUITTON",
    attendu: "Louis Vuitton",
    piege: "capitales",
  },
  {
    saisie: "lancome",
    attendu: "Lancôme",
    piege: "accent manquant — le cas que l'ancien filtre ratait",
  },
  {
    saisie: "dolce gabbana",
    attendu: "Dolce & Gabbana",
    piege: "esperluette omise",
  },
] as const;

async function ouvreChampMarque(page: Page): Promise<boolean> {
  const res = await page.goto("/admin/perfumes/new", { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) return false;

  const champ = page.getByRole("combobox", { name: /marque/i });
  await champ.waitFor({ state: "visible", timeout: 10_000 });
  await champ.click();

  // La liste se remplit par un appel à /api/admin/brands : sans cette attente,
  // « aucune marque ne correspond » serait vrai simplement parce qu'aucune
  // marque n'est encore chargée.
  await expect(page.getByRole("listbox", { name: /marques/i })).toBeVisible();
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10_000 });
  return true;
}

test.describe("Sélecteur de marque — pas de doublon", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    const ok = await installAdminSession(context, baseURL ?? "http://localhost:3000");
    test.skip(!ok, "ADMIN_JWT_SECRET absent de l'environnement.");
  });

  for (const cas of CAS) {
    test(`« ${cas.saisie} » retrouve ${cas.attendu} (${cas.piege})`, async ({ page }) => {
      const pret = await ouvreChampMarque(page);
      test.skip(!pret, "Écran nouveau parfum inaccessible.");

      await page.getByRole("combobox", { name: /marque/i }).fill(cas.saisie);

      // La marque existante est proposée…
      await expect(page.getByRole("option", { name: cas.attendu })).toBeVisible();

      // …et rien ne propose d'en créer une seconde.
      await expect(page.getByRole("button", { name: /créer la marque/i })).toHaveCount(0);
    });
  }

  test("contrôle négatif : une marque absente propose bien sa création", async ({ page }) => {
    const pret = await ouvreChampMarque(page);
    test.skip(!pret, "Écran nouveau parfum inaccessible.");

    await page
      .getByRole("combobox", { name: /marque/i })
      .fill("Maison Qui N Existe Pas 4718");

    await expect(page.getByRole("button", { name: /créer la marque/i })).toBeVisible();
  });

  test("le nom proposé à la création est mis en forme", async ({ page }) => {
    const pret = await ouvreChampMarque(page);
    test.skip(!pret, "Écran nouveau parfum inaccessible.");

    await page.getByRole("combobox", { name: /marque/i }).fill("maison inconnue 4718");

    // Ce n'est pas la saisie brute qui part en base : une marque enregistrée
    // « maison inconnue » côtoierait « Maison Inconnue » à la ligne suivante.
    await expect(
      page.getByRole("button", { name: /Créer la marque « Maison Inconnue 4718 »/ }),
    ).toBeVisible();
  });
});

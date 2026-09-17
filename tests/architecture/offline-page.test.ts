import { describe, expect, it } from "vitest";
import { exists, read } from "./support/sources";

/**
 * Page hors ligne autonome (docs/refonte/04-ARCHITECTURE.md §14.4) : s'affiche sans réseau et ne
 * dépend d'aucun bundle. Livrée au jalon J16 ; tant qu'elle n'existe pas, le test reste en attente et
 * s'active tout seul dès que le fichier apparaît.
 */

const FILE = "public/admin-offline.html";

describe("page hors ligne (04 §14.4)", () => {
  if (!exists(FILE)) {
    it.todo(`${FILE} autonome : CSS inline, aucune ressource externe, aucune URL hors /admin — livré au jalon J16`);
    return;
  }

  const html = read(FILE);

  it("ne charge aucune ressource : ni feuille, ni script, ni image externes", () => {
    expect(html).not.toMatch(/<link\b[^>]*rel=["']?stylesheet/i);
    expect(html).not.toMatch(/<script\b[^>]*\bsrc=/i);
    expect(html).not.toMatch(/url\(\s*["']?(https?:)?\/\//i);
    expect(html).not.toMatch(/\b(src|href)=["']?https?:/i);
  });

  it("ne référence aucune URL hors /admin", () => {
    const urls = [...html.matchAll(/\b(?:src|href|action)=["']([^"']+)["']/gi)].map((match) => match[1] as string);
    expect(urls.filter((url) => !url.startsWith("/admin") && !url.startsWith("#"))).toEqual([]);
  });

  it("est en français, avec une cible tactile d'au moins 44 px", () => {
    expect(html).toMatch(/<html[^>]*lang=["']fr["']/i);
    expect(html).toMatch(/min-height:\s*44px/);
  });
});

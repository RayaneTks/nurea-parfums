import { describe, expect, it } from "vitest";
import { colors } from "@/design/tokens";
import { OFFLINE_URL } from "@/app-shell/pwa/service-worker";
import { exists, read } from "./support/sources";

/**
 * Page hors ligne autonome (docs/refonte/04-ARCHITECTURE.md §14.4, 06 E09). Livrée au jalon J16.
 *
 * Elle est pré-cachée à l'installation et doit s'afficher des mois plus tard, réseau coupé : aucune
 * feuille, aucun script externe, aucune image, aucun bundle. L'existant servait `/admin/offline`,
 * une vraie page Next — donc des `/_next/static` qui disparaissaient au déploiement suivant
 * (01 §4.7) ; et son pré-cache suivait la redirection de connexion.
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
    expect(html).not.toMatch(/<img\b/i);
  });

  it("ne référence aucune URL hors /admin", () => {
    const urls = [...html.matchAll(/\b(?:src|href|action)=["']([^"']+)["']/gi)].map((match) => match[1] as string);
    expect(urls.filter((url) => !url.startsWith("/admin") && !url.startsWith("#"))).toEqual([]);
  });

  it("est en français, avec une cible tactile d'au moins 44 px", () => {
    expect(html).toMatch(/<html[^>]*lang=["']fr["']/i);
    expect(html).toMatch(/min-height:\s*44px/);
  });

  it("dit ce que 06 E09 lui fait dire, y compris la ligne du ticket en cours", () => {
    expect(html).toContain("Pas de connexion");
    expect(html).toContain(
      "Les données de gestion sont toujours lues en direct. Reconnecte-toi au réseau pour continuer.",
    );
    expect(html).toContain("Ton ticket en cours est gardé sur ce téléphone.");
    expect(html).toContain("Réessayer");
    expect(html).toContain("location.reload()");
  });

  it("lit le brouillon du composeur à la clé et au format de `draft-store.ts`", () => {
    // Un autre nom de clé afficherait la ligne… ou ne l'afficherait jamais : deux mensonges possibles.
    expect(html).toContain('"nurea:brouillon:vendre"');
    expect(html).toMatch(/parsed\.v !== 1/);
  });

  it("recopie les couleurs de tokens.ts, seul endroit du dépôt où c'est permis", () => {
    for (const value of [colors.bg, colors.surface, colors.accent, colors.text, colors.textMuted]) {
      expect(html).toContain(value);
    }
  });

  it("est servie à l'adresse que le service worker pré-cache", () => {
    expect(OFFLINE_URL).toBe(`/${FILE.replace(/^public\//, "")}`);
  });

  it("est hors du matcher de proxy.ts : le pré-cache ne peut pas tomber sur la connexion", () => {
    const matcher = read("proxy.ts");
    // Le matcher ne couvre que `/admin`, `/admin/:path*` et `/api/admin/:path*` ; `/admin-offline.html`
    // n'est aucun des trois (le tiret n'est pas une barre).
    expect(matcher).toContain('matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"]');
    expect(OFFLINE_URL.startsWith("/admin/")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ROUTE_SPECS, isNavigable, routeOf } from "@/app-shell/routes";
import { ADMIN_SPLASH_TARGETS, ADMIN_STARTUP_IMAGES, splashFileName } from "@/lib/pwa/admin-splash";
import { getAdminWebManifest } from "@/lib/pwa/manifests";
import { exists, read } from "./support/sources";

/**
 * PWA de la gestion (04 §14, 06 §1.6, 07 J16).
 *
 * Trois invariants que l'existant n'avait pas :
 *  - le service worker est RENDU par une route, plus un fichier statique à version figée ;
 *  - la liste des écrans de lancement iOS vit à UN endroit, lu par le script et par le layout ;
 *  - les raccourcis du manifeste pointent des routes françaises livrées, avec le vocabulaire canonique.
 */

describe("service worker (04 §14.3)", () => {
  it("n'est plus un fichier statique : `public/admin-sw.js` a disparu au profit de la route", () => {
    expect(exists("public/admin-sw.js")).toBe(false);
    expect(exists("app/admin-sw.js/route.ts")).toBe(true);
  });

  it("la route sert le script rendu avec l'identifiant du déploiement, sans mise en cache HTTP", () => {
    const route = read("app/admin-sw.js/route.ts");
    expect(route).toContain("renderServiceWorker(BUILD_ID)");
    expect(route).toContain('"Content-Type": "text/javascript; charset=utf-8"');
    expect(route).toContain('"Cache-Control": "no-cache"');
  });
});

describe("écrans de lancement iOS (04 §14.1)", () => {
  it("le script de génération lit la même liste que `admin-splash.ts`", () => {
    const script = read("scripts/build-admin-pwa-assets.mjs");
    expect(script).toContain("src/lib/pwa/splash-targets.json");
    // Plus de seconde liste recopiée dans le script (01 §4.7 : les deux avaient divergé).
    expect(script).not.toMatch(/\{\s*w:\s*\d+,\s*h:\s*\d+,\s*r:\s*\d+\s*\}/);
  });

  it("douze cibles, toutes distinctes, toutes générées dans public/pwa/admin", () => {
    expect(ADMIN_SPLASH_TARGETS).toHaveLength(12);
    const keys = ADMIN_SPLASH_TARGETS.map((target) => `${target.w}x${target.h}@${target.r}`);
    expect(new Set(keys).size).toBe(12);
    const manquants = ADMIN_SPLASH_TARGETS.filter((target) => !exists(`public/pwa/admin/${splashFileName(target)}`));
    expect(manquants).toEqual([]);
  });

  it("chaque image a la media query exacte de son device (Safari n'accepte rien d'approché)", () => {
    expect(ADMIN_STARTUP_IMAGES).toHaveLength(12);
    const premier = ADMIN_SPLASH_TARGETS[0]!;
    expect(ADMIN_STARTUP_IMAGES[0]).toEqual({
      url: `/pwa/admin/${splashFileName(premier)}`,
      media: `(device-width: ${premier.w}px) and (device-height: ${premier.h}px) and (-webkit-device-pixel-ratio: ${premier.r}) and (orientation: portrait)`,
    });
  });
});

describe("raccourcis du manifeste (06 §1.6)", () => {
  const manifest = getAdminWebManifest();
  const shortcuts = manifest.shortcuts ?? [];

  it("les trois gestes quotidiens : Vendre, Nouvelle commande, Encaisser", () => {
    expect(shortcuts.map((shortcut) => shortcut.url)).toEqual([
      "/admin/vendre",
      "/admin/commandes/nouvelle",
      "/admin/encaisser",
    ]);
  });

  it("aucune ancienne adresse anglaise, aucun terme hors du lexique (06 §1.7)", () => {
    const texte = JSON.stringify(shortcuts);
    expect(texte).not.toContain("/admin/ordres");
    expect(texte).not.toContain("À traiter");
    expect(texte).not.toMatch(/filter=/);
  });

  it("chaque raccourci mène à un écran livré — directement, ou par la redirection de la prise de commande", () => {
    const redirects = read("next.config.mjs");
    for (const { url } of shortcuts) {
      if (isNavigable(url)) continue;
      // `/admin/commandes/nouvelle` n'a pas de page : elle est présentée par `/admin/vendre?mode=commande` (A-3).
      expect(redirects, `raccourci « ${url} » sans écran ni redirection`).toContain(`source: "${url}"`);
    }
    expect(routeOf("/admin/vendre")?.name).toBe("vendre");
    expect(ROUTE_SPECS.encaisser.etat).toBe("livree");
  });

  it("le scope reste /admin et le manifeste garde ses couleurs (04 §14.1)", () => {
    expect(manifest.scope).toBe("/admin");
    expect(manifest.start_url).toBe("/admin");
    expect(manifest.background_color).toBe("#7B0B1D");
    expect(manifest.theme_color).toBe("#F2F2F7");
  });
});

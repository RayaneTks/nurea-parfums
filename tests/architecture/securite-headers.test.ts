import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { read, ROOT, stripComments } from "./support/sources";

/**
 * Les en-têtes de sécurité des deux registres (docs/refonte/04-ARCHITECTURE.md §8.6), tels que
 * `next.config.mjs` les déclare — la configuration est LUE, jamais recopiée ici : un test qui
 * redéclare ce qu'il vérifie ne vérifie que lui-même.
 *
 * Écrit après l'audit de surface d'attaque du 23/09/2026, dont le constat élevé était l'absence de
 * tout en-tête applicatif sur la vitrine.
 */

type Header = { key: string; value: string };
type Rule = { source: string; headers: Header[] };

// Import par URL de fichier : `next.config.mjs` est du JavaScript, hors du programme TypeScript.
const config = (await import(pathToFileURL(path.join(ROOT, "next.config.mjs")).href)) as {
  default: { headers: () => Promise<Rule[]> };
  PUBLIC_SECURITY_HEADERS: Header[];
  ADMIN_SECURITY_HEADERS: Header[];
  ADMIN_HEADER_SOURCES: string[];
  PUBLIC_HEADER_SOURCE: string;
};

const value = (headers: Header[], key: string): string | undefined =>
  headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

const directive = (csp: string, name: string): string | undefined =>
  csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));

const REGISTERS = [
  { name: "vitrine", headers: config.PUBLIC_SECURITY_HEADERS },
  { name: "gestion", headers: config.ADMIN_SECURITY_HEADERS },
];

describe("en-têtes de sécurité (04 §8.6)", () => {
  for (const register of REGISTERS) {
    describe(register.name, () => {
      it.each([
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Cross-Origin-Opener-Policy",
      ])("pose %s", (key) => {
        expect(value(register.headers, key)).toBeTruthy();
      });

      it("HSTS couvre les sous-domaines et vise la liste de préchargement", () => {
        const hsts = value(register.headers, "Strict-Transport-Security") ?? "";
        expect(hsts).toContain("includeSubDomains");
        expect(hsts).toContain("preload");
        const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
        expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
      });

      it("refuse le cadrage, les plugins et le détournement d'URL relatives", () => {
        const csp = value(register.headers, "Content-Security-Policy") ?? "";
        expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
        expect(directive(csp, "object-src")).toBe("object-src 'none'");
        expect(directive(csp, "base-uri")).toBe("base-uri 'self'");
        expect(directive(csp, "form-action")).toBe("form-action 'self'");
        expect(value(register.headers, "X-Frame-Options")).toBe("DENY");
        expect(value(register.headers, "X-Content-Type-Options")).toBe("nosniff");
      });

      it("aucune source de script ni de connexion n'est ouverte à tous", () => {
        const csp = value(register.headers, "Content-Security-Policy") ?? "";
        for (const name of ["default-src", "script-src", "connect-src", "img-src", "style-src"]) {
          expect(directive(csp, name), `${name} manquante`).toBeTruthy();
          expect(directive(csp, name)).not.toMatch(/(^|\s)\*(\s|$)/);
          expect(directive(csp, name)).not.toContain("http:");
        }
      });

      it("hors développement, aucun script n'est évalué", () => {
        const csp = value(register.headers, "Content-Security-Policy") ?? "";
        expect(csp).not.toContain("unsafe-eval");
      });
    });
  }

  it("la gestion se tient hors des index, sans que robots.txt publie son adresse", () => {
    expect(value(config.ADMIN_SECURITY_HEADERS, "X-Robots-Tag")).toContain("noindex");
    // Hors commentaires : l'explication a le droit de nommer ce qui a été retiré, pas le code.
    const rules = stripComments(read("app/robots.ts"));
    expect(rules).not.toMatch(/disallow/i);
    expect(rules).not.toContain("/admin");
  });

  it("chaque chemin reçoit exactement une règle : la lookahead publique exclut la gestion", async () => {
    const rules = await config.default.headers();
    expect(rules.map((rule) => rule.source)).toEqual([config.PUBLIC_HEADER_SOURCE, ...config.ADMIN_HEADER_SOURCES]);

    const publicMatcher = new RegExp(`^/${config.PUBLIC_HEADER_SOURCE.replace(/^\//, "")}$`);
    for (const admin of ["/admin", "/admin/", "/admin/commandes", "/api/admin/search", "/admin-sw.js"]) {
      expect(publicMatcher.test(admin), `${admin} reçoit aussi les en-têtes de la vitrine`).toBe(false);
    }
    for (const vitrine of ["/", "/contact", "/marque", "/api/perfume-search", "/administration"]) {
      expect(publicMatcher.test(vitrine), `${vitrine} n'est pas couvert`).toBe(true);
    }
  });
});

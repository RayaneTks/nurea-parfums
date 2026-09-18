import { describe, expect, it } from "vitest";
import { exists, read } from "./support/sources";

/**
 * La documentation du dépôt décrit l'app TELLE QU'ELLE EST (04 §17.5, 02 §8 : « un commentaire ou une
 * documentation qui promet ce que le code ne fait pas est traité comme un bug »). Sur le modèle de
 * `vocabulaire.test.ts`, qui tient le vocabulaire des écrans, ce test tient celui des documents.
 *
 * Il refuse les termes de l'ANCIENNE gestion. Chacun désignait une chose réelle avant la refonte et
 * n'en désigne plus aucune : un agent qui lit `CLAUDE.md` et va chercher `middleware.ts` perd son
 * temps, puis écrit du code contre une architecture morte.
 *
 * Deux moitiés, toutes deux nécessaires :
 * - ce qui ne doit PLUS être dit (§ termes morts) ;
 * - ce qui doit ÊTRE dit (§ repères vivants) — sans quoi un document vidé passerait le test.
 *
 * Convention : un terme mort n'est pas cité, même pour l'interdire. La liste des termes bannis des
 * écrans vit dans `vocabulaire.test.ts` et `CLAUDE.md` y renvoie au lieu de la recopier.
 */

const CLAUDE = "CLAUDE.md";
const PRODUIT = "docs/admin/PRODUCT.md";
const DESIGN = "docs/admin/DESIGN.md";
const README_REFONTE = "docs/refonte/00-README.md";

type DeadTerm = {
  /** Ce qu'on trouve dans le document. */
  readonly regex: RegExp;
  /** Comment on le nomme dans le rapport d'échec. */
  readonly label: string;
  /** Ce qu'il faut dire à la place. */
  readonly instead: string;
  /** Documents concernés. */
  readonly files: readonly string[];
};

const DOCS_GESTION = [CLAUDE, PRODUIT, DESIGN] as const;

const DEAD: readonly DeadTerm[] = [
  {
    regex: /(?<![\w/.-])middleware\.ts\b/,
    label: "middleware.ts",
    instead: "`proxy.ts` (04 §8.3)",
    files: DOCS_GESTION,
  },
  {
    regex: /public\/admin-sw\.js\b/,
    label: "public/admin-sw.js",
    instead: "`app/admin-sw.js/route.ts` rendu depuis `src/app-shell/pwa/service-worker.ts` (04 §14.3)",
    files: DOCS_GESTION,
  },
  {
    regex: /\/admin\/ordres\b/,
    label: "/admin/ordres",
    instead: "`/admin/commandes` — les routes de la gestion sont en français (04 §2.3)",
    files: DOCS_GESTION,
  },
  {
    /**
     * Le groupe de liste de l'ancienne app. Insensible à la casse, comme dans
     * `vocabulaire.test.ts` : « à traiter » en bas de casse désignerait le même groupe mort. En
     * contrepartie, la tournure française ordinaire (« un dossier à traiter ») est refusée elle
     * aussi dans ces trois documents — dire « à faire », « à régler », « en attente ».
     */
    regex: /(?<![\p{L}\p{N}_])[Àà]\s+traiter(?![\p{L}\p{N}_])/u,
    label: "« À traiter »",
    instead: "« Confirmée », ou le nom du segment de liste concerné (02 §6)",
    files: DOCS_GESTION,
  },
  {
    regex: /(?<![\w:-])db:(?:push|sync)(?![\w-])/,
    label: "script npm db:push / db:sync",
    instead: "une migration Prisma — la synchronisation directe ignore CHECK, triggers et vue (04 §17.3)",
    files: [CLAUDE],
  },
  {
    // Les contenances d'avant le 10/09/2026, sous toutes leurs séparations.
    regex: /(?<!\d)30\s*[/·–-]\s*50\s*[/·–-]\s*100(?!\d)/,
    label: "contenances 30 / 50 / 100 ml",
    instead: "10 / 50 / 80 ml, 80 par défaut (`src/domain/sale-line.ts`)",
    files: [CLAUDE],
  },
];

/** Apostrophe typographique et espaces insécables ramenées à leur forme simple. */
const normalize = (text: string) => text.replace(/[’ʼ]/g, "'").replace(/[  ]/g, " ");

/** Une entrée par occurrence : fichier, ligne, terme, remplacement. */
function deadTerms(file: string, source: string): string[] {
  const found: string[] = [];
  const lines = normalize(source).split("\n");
  for (const term of DEAD) {
    if (!term.files.includes(file)) continue;
    lines.forEach((line, index) => {
      if (term.regex.test(line)) {
        found.push(`${file}:${index + 1} — ${term.label} : dire ${term.instead}`);
      }
    });
  }
  return found;
}

describe("documentation du dépôt : aucun terme mort (04 §17.5)", () => {
  it.each([CLAUDE, PRODUIT, DESIGN])("%s ne décrit plus l'ancienne gestion", (file) => {
    expect(exists(file), `${file} est absent`).toBe(true);
    expect(deadTerms(file, read(file))).toEqual([]);
  });

  it("le contrôle trouve bien chaque terme, et épargne ce qui lui ressemble", () => {
    const sample = [
      "La garde vit dans `middleware.ts`.",
      "Le service worker est `public/admin-sw.js`.",
      "La liste est servie par `/admin/ordres`.",
      "Segment « À traiter » avec son compteur.",
      "Synchroniser le schéma : `npm run db:push`.",
      "Contenances 30 / 50 / 100 ml, 100 par défaut.",
    ].join("\n");
    expect(deadTerms(CLAUDE, sample).map((entry) => entry.split(" — ")[1]?.split(" : ")[0])).toEqual([
      "middleware.ts",
      "public/admin-sw.js",
      "/admin/ordres",
      "« À traiter »",
      "script npm db:push / db:sync",
      "contenances 30 / 50 / 100 ml",
    ]);

    const innocent = [
      "`app/admin-sw.js/route.ts` répond `GET /admin-sw.js`.",
      "Les commandes vivent sous `/admin/commandes`, jamais sous un nom anglais.",
      "Un cas tordu reste à régler à la main en préproduction.",
      "Contenances 10 / 50 / 80 ml, 80 par défaut.",
      "Le proxy remplace l'ancienne garde de bord.",
      "Traiter la ligne suivante ; les traiter toutes ; rien à traiterX.",
      "Voir `tests/db/transactions/t13-assign-documents-to-batch.test.ts`.",
      "Le lot 30 coûte 50 €, le 100 en vaut 80.",
    ].join("\n");
    expect(deadTerms(CLAUDE, innocent)).toEqual([]);
  });
});

/**
 * Repères vivants : ce que la documentation doit nommer. Un document qu'on viderait de sa substance
 * passerait la moitié précédente sans rien décrire ; ces assertions le rattrapent. Elles ne visent
 * que des faits stables (noms de fichiers, d'onglets, de variables), pas des tournures.
 */
const ALIVE: readonly { file: string; needles: readonly string[] }[] = [
  {
    file: CLAUDE,
    needles: [
      "proxy.ts",
      "src/contracts/",
      "src/server/chiffres",
      "app/admin-sw.js/route.ts",
      "src/app-shell/routes.ts",
      "src/app-shell/navigation.ts",
      "NUREA_GESTION_MAINTENANCE",
      "NUREA_SKIP_MIGRATE_DEPLOY",
      "localhost:54329",
      "migration:reprise",
      "repetition:refresh",
      "10 / 50 / 80 ml",
      "/admin/commandes",
      "/admin/vendre",
      "/admin/encaisser",
      "/admin/reglages",
      "/admin/journee",
      "/admin/statistiques",
      "Accueil · Commandes · Vendre · Clients · Catalogue",
      "Encaissé / À encaisser / Marge nette / Trésorerie",
    ],
  },
  {
    file: PRODUIT,
    needles: ["/admin/commandes", "/admin/encaisser", "/admin/reglages", "/admin/journee", "/admin/statistiques", "Clients", "Catalogue"],
  },
  {
    file: DESIGN,
    needles: ["/admin/commandes", "src/app-shell/navigation.ts", "npm run test:layout"],
  },
  {
    file: README_REFONTE,
    needles: ["08-RECETTE.md", "Ce qui reste avant la bascule"],
  },
];

describe("documentation du dépôt : les repères vivants sont nommés", () => {
  it.each(ALIVE.map(({ file, needles }) => [file, needles] as const))("%s nomme ce qui existe", (file, needles) => {
    const source = normalize(read(file));
    expect(needles.filter((needle) => !source.includes(normalize(needle)))).toEqual([]);
  });
});

describe("les cinq onglets sont ceux du code (06 §1.4)", () => {
  it("navigation.ts, CLAUDE.md et docs/admin/PRODUCT.md disent les mêmes", () => {
    const navigation = read("src/app-shell/navigation.ts");
    const labels = [...navigation.matchAll(/^\s*label: "([^"]+)",$/gm)].map((match) => match[1] as string);
    expect(labels).toEqual(["Accueil", "Commandes", "Vendre", "Clients", "Catalogue"]);

    const claude = normalize(read(CLAUDE));
    expect(claude).toContain(labels.join(" · "));

    // Le tableau des onglets de PRODUCT.md, une ligne par onglet, dans l'ordre du code.
    const produit = normalize(read(PRODUIT));
    const rows = [...produit.matchAll(/^\| \*\*([^*]+)\*\* \|/gm)].map((match) => (match[1] as string).trim());
    expect(rows.slice(0, labels.length)).toEqual(labels);
  });
});

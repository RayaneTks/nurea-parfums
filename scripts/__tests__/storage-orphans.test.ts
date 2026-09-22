import { describe, expect, it } from "vitest";
import {
  UPLOAD_FOLDER,
  UPLOAD_MAX_AGE_HOURS,
  assertSameProject,
  findOrphans,
  parseArgs,
  publicPrefix,
  referencedPaths,
  type StoredObject,
} from "../storage-orphans";

/**
 * Fonctions pures de la tâche « objets orphelins » (04 §7.3, §12 ; 06 F-4.5-04). Le script lui-même n'est
 * jamais exécuté ici : il ne s'exécute que lancé par son chemin, et n'importe la base qu'à ce moment-là.
 *
 * L'enjeu : `--apply` supprime. Ce qui est RÉFÉRENCÉ (dont la vignette d'une vente passée) ne doit jamais
 * être compté, un envoi récent non plus — et un original temporaire (`tmp/`, décision du 17/09/2026), que
 * rien ne référence par construction, doit finir par partir.
 */

const NOW = new Date("2026-09-20T12:00:00.000Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);
const PREFIX = publicPrefix("https://projet-essai.supabase.co/", "catalog");

describe("parseArgs", () => {
  it("liste sans rien supprimer par défaut, 24 h, bucket catalog", () => {
    expect(parseArgs([])).toEqual({ apply: false, minAgeHours: 24, bucket: "catalog" });
  });

  it("lit --apply, --min-age-hours, --bucket et les hôtes confirmés", () => {
    expect(parseArgs(["--apply", "--min-age-hours", "0", "--bucket", "catalog-preprod", "--confirm-host", "db.x", "--confirm-storage-host", "x.supabase.co"])).toEqual({
      apply: true,
      minAgeHours: 0,
      bucket: "catalog-preprod",
      confirmHost: "db.x",
      confirmStorageHost: "x.supabase.co",
    });
  });

  it("refuse un argument inconnu ou un âge illisible", () => {
    expect(() => parseArgs(["--tout-supprimer"])).toThrow(/Argument inconnu/);
    expect(() => parseArgs(["--min-age-hours", "hier"])).toThrow(/heures/);
    expect(() => parseArgs(["--min-age-hours", "-1"])).toThrow(/heures/);
  });
});

describe("referencedPaths — ce qui est désigné par la base", () => {
  it("URL publiques de notre bucket ⇒ chemins ; autre projet, autre bucket et vide ignorés", () => {
    const referenced = referencedPaths(
      {
        urls: [
          `${PREFIX}perfumes/1757500000000-1a2b3c4d.webp`,
          `${PREFIX}stories/12/1757500000001-1a2b3c4e.webp?download=1`,
          // Production, telle que la copie de préproduction la référence : hors de notre bucket.
          "https://lkdhqqzocmxtyarseizc.supabase.co/storage/v1/object/public/catalog/perfumes/sauvage.webp",
          "https://projet-essai.supabase.co/storage/v1/object/public/autre/perfumes/x.webp",
          "/parfums/legacy.webp",
          "",
          null,
        ],
        paths: ["stories/12/1757500000002-1a2b3c4f.webp", " brands/1757500000003-1a2b3c50.webp "],
      },
      PREFIX,
    );
    expect([...referenced].sort()).toEqual([
      "brands/1757500000003-1a2b3c50.webp",
      "perfumes/1757500000000-1a2b3c4d.webp",
      "stories/12/1757500000001-1a2b3c4e.webp",
      "stories/12/1757500000002-1a2b3c4f.webp",
    ]);
  });
});

describe("findOrphans", () => {
  const object = (path: string, hours: number | null): StoredObject => ({
    path,
    createdAt: hours === null ? null : hoursAgo(hours),
  });

  it("garde ce qui est référencé et ce qui est récent ; compte le reste", () => {
    const referenced = new Set(["perfumes/vendu.webp"]);
    const objects = [
      object("perfumes/vendu.webp", 500), // vignette d'une vente passée : jamais orpheline
      object("perfumes/abandonne.webp", 48), // formulaire abandonné
      object("brands/tout-juste-envoye.webp", 1), // fiche pas encore enregistrée
      object("stories/12/sans-ligne.webp", 72), // rangement refusé après écriture
      object("perfumes/sans-date.webp", null), // date inconnue : traitée comme ancienne
    ];
    expect(findOrphans(objects, referenced, NOW, 24).map((o) => o.path)).toEqual([
      "perfumes/abandonne.webp",
      "stories/12/sans-ligne.webp",
      "perfumes/sans-date.webp",
    ]);
  });

  it(`un original ${UPLOAD_FOLDER}/ part au-delà de ${UPLOAD_MAX_AGE_HOURS} h, quel que soit --min-age-hours ; jamais avant`, () => {
    const objects = [
      object(`${UPLOAD_FOLDER}/perfumes/1757500000000-1a2b3c4d.jpg`, 25),
      object(`${UPLOAD_FOLDER}/stories/12/1757500000001-1a2b3c4e.heic`, 2),
      object(`${UPLOAD_FOLDER}/brands/1757500000002-1a2b3c4f.png`, UPLOAD_MAX_AGE_HOURS),
    ];
    // Même avec un plafond d'un an, un original vieux de 25 h est un orphelin : rien ne le référencera jamais.
    expect(findOrphans(objects, new Set(), NOW, 8_760).map((o) => o.path)).toEqual([
      `${UPLOAD_FOLDER}/perfumes/1757500000000-1a2b3c4d.jpg`,
      `${UPLOAD_FOLDER}/brands/1757500000002-1a2b3c4f.png`,
    ]);
    // Et une conversion en cours (2 h au plus) n'est jamais emportée, même avec --min-age-hours 0.
    expect(findOrphans(objects, new Set(), NOW, 0).map((o) => o.path)).not.toContain(
      `${UPLOAD_FOLDER}/stories/12/1757500000001-1a2b3c4e.heic`,
    );
  });
});

describe("assertSameProject — la base et le bucket du même projet", () => {
  it("accepte production ⇔ production et essai ⇔ essai", () => {
    expect(() =>
      assertSameProject(
        "postgresql://postgres.lkdhqqzocmxtyarseizc:x@aws.pooler.supabase.com:6543/postgres",
        "https://lkdhqqzocmxtyarseizc.supabase.co",
      ),
    ).not.toThrow();
    expect(() => assertSameProject("postgresql://nurea:nurea@localhost:54329/nurea_test", "https://projet-essai.supabase.co")).not.toThrow();
  });

  it("refuse une base de préproduction devant le stockage de production (et l'inverse)", () => {
    expect(() =>
      assertSameProject("postgresql://nurea:nurea@localhost:54329/nurea_test", "https://lkdhqqzocmxtyarseizc.supabase.co"),
    ).toThrow(/ne sont pas le même projet/);
    expect(() =>
      assertSameProject(
        "postgresql://postgres.lkdhqqzocmxtyarseizc:x@aws.pooler.supabase.com:6543/postgres",
        "https://projet-essai.supabase.co",
      ),
    ).toThrow(/ne sont pas le même projet/);
  });
});

import { describe, expect, it } from "vitest";
import { isTestFile, listSources, read, stripComments } from "./support/sources";

/**
 * La fiche document est une sheet adressable `?doc=<id>` sur TOUTE page du shell (07 §3.0.2 A-3, 04 §0.1, 05 §3.2
 * `PageScaffold`) : chaque page du groupe `(gestion)` lit `searchParams.doc` et le transmet ; chaque `PageScaffold`
 * d'écran reçoit `docId` et monte la fiche par son emplacement `sheet` (`<DocumentSheetSlot docId=… />`, qui rend
 * `<Block><DocumentSheetBlock id=… /></Block>` dans le cadre de la sheet). Un écran qui l'oublie rendrait un lien
 * `?doc=` muet.
 */

const GESTION_PAGE = /^app\/admin\/\(gestion\)\/(.+\/)?page\.tsx$/;

/** Une page du shell lit ses `searchParams` et en transmet `doc` (sous le nom `docId`). */
export function pageViolations(file: string, source: string): string[] {
  const code = stripComments(source);
  const out: string[] = [];
  if (!/\bsearchParams\b/.test(code)) out.push(`${file} : ne lit pas ses searchParams (paramètre « doc »)`);
  if (!/\bdocId=\{[^}]*\bdoc\b/.test(code)) out.push(`${file} : ne transmet pas « doc » en docId`);
  return out;
}

/** Tout `<PageScaffold` d'écran reçoit `docId` et monte la fiche par `sheet={<DocumentSheetSlot docId=…`. */
export function scaffoldViolations(file: string, source: string): string[] {
  const code = stripComments(source);
  const out: string[] = [];
  for (const match of code.matchAll(/<PageScaffold\b([\s\S]*?)>/g)) {
    const props = match[1] ?? "";
    if (!/\bdocId=\{/.test(props)) out.push(`${file} : <PageScaffold> sans docId`);
    if (!/\bsheet=\{\s*<DocumentSheetSlot\s+docId=\{/.test(props)) out.push(`${file} : <PageScaffold> sans sheet={<DocumentSheetSlot docId={…} />}`);
  }
  return out;
}

/**
 * Écrans du shell : pages de `src/features/*`, pages et écrans provisoires de `app/admin/(gestion)`. Hors champ :
 * `loading.tsx` (squelette de navigation, sans paramètres) et `error.tsx` (écran d'erreur).
 */
const SCREEN_FILES = [
  ...listSources("src/features").filter((file) => /^src\/features\/[^/]+\/pages\/[^/]+\.tsx$/.test(file)),
  ...listSources("app/admin/(gestion)").filter((file) => file.endsWith(".tsx") && !/\/(loading|error)\.tsx$/.test(file)),
].filter((file) => !isTestFile(file));

describe("fiche document adressable sur toute page du shell (A-3)", () => {
  it("chaque page du groupe (gestion) lit searchParams et transmet doc en docId", () => {
    const pages = listSources("app/admin/(gestion)").filter((file) => GESTION_PAGE.test(file));
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.flatMap((file) => pageViolations(file, read(file)))).toEqual([]);
  });

  it("chaque PageScaffold d'écran reçoit docId et monte DocumentSheetSlot par l'emplacement sheet", () => {
    const scaffolds = SCREEN_FILES.filter((file) => /<PageScaffold\b/.test(read(file)));
    expect(scaffolds.length).toBeGreaterThan(0);
    expect(scaffolds.flatMap((file) => scaffoldViolations(file, read(file)))).toEqual([]);
  });

  it("le contrôle détecte une page qui oublie doc et un PageScaffold sans fiche", () => {
    const forgetful = 'export default function Page() { return <CataloguePage />; }';
    expect(pageViolations("app/admin/(gestion)/x/page.tsx", forgetful)).toHaveLength(2);
    const good = "export default async function Page({ searchParams }) { const p = await searchParams; return <X docId={firstParam(p.doc)} />; }";
    expect(pageViolations("app/admin/(gestion)/x/page.tsx", good)).toEqual([]);

    expect(scaffoldViolations("src/features/x/pages/X.tsx", "<PageScaffold ariaLabel=\"X\">")).toHaveLength(2);
    expect(scaffoldViolations("src/features/x/pages/X.tsx", '<PageScaffold docId={docId} sheet={<DocumentSheetSlot docId={docId} />}>')).toEqual([]);
  });
});

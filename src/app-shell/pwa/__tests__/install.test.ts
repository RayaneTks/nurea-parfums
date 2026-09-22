import { describe, expect, it } from "vitest";
import { isIosSafari, isStandalone } from "../install";

/**
 * Détection du chemin d'installation (04 §14.1, 06 E01 zone 2).
 *
 * Deux erreurs coûtent cher, et ce sont les deux que ce test interdit :
 *  - proposer la consigne « Partager → Sur l'écran d'accueil » à un navigateur qui n'a pas ce menu
 *    (Chrome iOS, ou un Chromium qui emprunte l'agent d'un iPhone : les tests, les outils de
 *    développement) — une consigne impossible à suivre ;
 *  - proposer d'installer une app DÉJÀ installée.
 */

const navigatorLike = (over: Partial<Navigator> & { standalone?: boolean }) =>
  ({ userAgent: "", platform: "", maxTouchPoints: 0, ...over }) as unknown as Navigator;

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

describe("isIosSafari (04 §14.1)", () => {
  it("reconnaît Safari sur iPhone et sur iPad", () => {
    expect(isIosSafari(navigatorLike({ userAgent: IPHONE_SAFARI, standalone: false }))).toBe(true);
    // iPadOS se fait passer pour un Mac : c'est le tactile qui le trahit.
    expect(isIosSafari(navigatorLike({ platform: "MacIntel", maxTouchPoints: 5, standalone: false }))).toBe(true);
  });

  it("refuse Chrome iOS : même moteur, pas ce menu", () => {
    expect(isIosSafari(navigatorLike({ userAgent: IPHONE_CHROME, standalone: false }))).toBe(false);
  });

  it("refuse un Chromium qui emprunte l'agent d'un iPhone (il n'a pas `navigator.standalone`)", () => {
    expect(isIosSafari(navigatorLike({ userAgent: IPHONE_SAFARI }))).toBe(false);
  });

  it("refuse Android et le poste de bureau", () => {
    expect(isIosSafari(navigatorLike({ userAgent: ANDROID_CHROME }))).toBe(false);
    expect(isIosSafari(navigatorLike({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 0 }))).toBe(false);
  });
});

describe("isStandalone (04 §14.1)", () => {
  const win = (over: { standalone?: boolean; displayMode?: boolean }) =>
    ({
      navigator: over.standalone === undefined ? {} : { standalone: over.standalone },
      matchMedia: () => ({ matches: over.displayMode === true }),
    }) as unknown as Window;

  it("vrai quand iOS dit `standalone`, ou quand la media query le dit", () => {
    expect(isStandalone(win({ standalone: true }))).toBe(true);
    expect(isStandalone(win({ displayMode: true }))).toBe(true);
  });

  it("faux dans un onglet ordinaire — c'est là qu'il y a quelque chose à proposer", () => {
    expect(isStandalone(win({ standalone: false }))).toBe(false);
    expect(isStandalone(win({}))).toBe(false);
  });
});

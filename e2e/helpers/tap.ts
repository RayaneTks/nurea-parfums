import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Compteur de taps (02 §2, 06 « Compter les taps », 04 §16.4) : chaque parcours passe par `tap()` et
 * vérifie son budget. Un tap = un toucher qui déclenche quelque chose ; une saisie au clavier
 * (`fill`) ne compte pas.
 */
export class TapCounter {
  private taps: string[] = [];

  constructor(private readonly page: Page) {}

  /** Touche la cible (vrai `tap` sur un appareil tactile, clic sinon) et le compte. */
  async tap(target: Locator, label?: string): Promise<void> {
    this.taps.push(label ?? (await target.first().textContent())?.trim() ?? "?");
    const touch = await this.page.evaluate(() => navigator.maxTouchPoints > 0);
    if (touch) await target.tap();
    else await target.click();
  }

  /**
   * Glisse une ligne (06 « Compter les taps » : un glissement compte 1, le tap sur l'action révélée 1 de plus).
   * Geste réel au pointeur — appui, déplacement franc de 140 px, relâché — sur `SwipeableRow` (05 §4.2).
   */
  async swipe(target: Locator, direction: "right" | "left", label?: string): Promise<void> {
    this.taps.push(label ?? `glisser vers la ${direction === "right" ? "droite" : "gauche"}`);
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("swipe : cible sans boîte (masquée ?)");
    const y = box.y + box.height / 2;
    const startX = direction === "right" ? box.x + 24 : box.x + box.width - 24;
    const endX = direction === "right" ? startX + 140 : startX - 140;
    await this.page.mouse.move(startX, y);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, y, { steps: 12 });
    await this.page.mouse.up();
  }

  get count(): number {
    return this.taps.length;
  }

  /** Le parcours tient son budget ; en cas d'échec, la liste des taps est dans le message. */
  expectAtMost(budget: number): void {
    expect(this.taps.length, `taps : ${this.taps.join(" → ")}`).toBeLessThanOrEqual(budget);
  }
}

export function countTaps(page: Page): TapCounter {
  return new TapCounter(page);
}

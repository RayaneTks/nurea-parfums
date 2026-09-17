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

import { describe, expect, it } from "vitest";
import type { MoneyString } from "@/domain/money";
import { barHeights, labelStride, shouldRenderBarChart, type BarPoint } from "../bar-chart-model";

const p = (label: string, value: string): BarPoint => ({ label, value: value as MoneyString });

describe("BarChart — modèle", () => {
  it("ne se rend pas sous deux points (05 §5.3)", () => {
    expect(shouldRenderBarChart([])).toBe(false);
    expect(shouldRenderBarChart([p("S36", "120.00")])).toBe(false);
    expect(shouldRenderBarChart([p("S36", "120.00"), p("S37", "80.00")])).toBe(true);
  });

  it("hauteurs en % de la plus haute, par le module monétaire", () => {
    expect(barHeights([p("a", "50.00"), p("b", "200.00"), p("c", "46.80")])).toEqual(["25.0", "100.0", "23.4"]);
  });

  it("négatif ou nul : 0 ; minuscule mais non nul : reste visible", () => {
    expect(barHeights([p("a", "-10.00"), p("b", "0.00"), p("c", "0.01"), p("d", "5000.00")])).toEqual([
      "0",
      "0",
      "1",
      "100.0",
    ]);
  });

  it("tout à zéro : barres plates, pas de division par zéro", () => {
    expect(barHeights([p("a", "0.00"), p("b", "0.00")])).toEqual(["0", "0"]);
  });

  it("au plus six libellés au-delà de 7 barres", () => {
    expect(labelStride(7)).toBe(1);
    expect(labelStride(12)).toBe(2);
    expect(labelStride(52)).toBe(9);
  });
});

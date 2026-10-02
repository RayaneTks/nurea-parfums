import { describe, expect, it } from "vitest";
import {
  SPRING_FLICK,
  SPRING_SETTLE,
  VelocityTracker,
  project,
  rubberband,
  springAtRest,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from "../physics";

function simulate(config: SpringConfig, from: SpringState, target: number, seconds: number) {
  let state = from;
  let peak = from.value;
  for (let t = 0; t < seconds; t += 1 / 60) {
    state = stepSpring(state, target, 1 / 60, config);
    peak = Math.max(peak, state.value);
  }
  return { state, peak };
}

describe("ressort", () => {
  it("amortissement 1 : se pose sans jamais dépasser la cible", () => {
    const { state, peak } = simulate(SPRING_SETTLE, { value: 0, velocity: 0 }, 1, 2);
    expect(springAtRest(state, 1)).toBe(true);
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it("amortissement < 1 : un léger dépassement, puis le repos", () => {
    const { state, peak } = simulate(SPRING_FLICK, { value: 0, velocity: 0 }, 1, 3);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.05);
    expect(springAtRest(state, 1)).toBe(true);
  });

  it("garde la vitesse reçue : lancé vers le haut, il part d'abord vers le haut", () => {
    const next = stepSpring({ value: 0.5, velocity: 4 }, 0, 1 / 60, SPRING_SETTLE);
    expect(next.value).toBeGreaterThan(0.5);
  });

  it("une image sautée ne fait pas diverger l'intégration", () => {
    const next = stepSpring({ value: 0, velocity: 0 }, 1, 5, SPRING_SETTLE);
    expect(Number.isFinite(next.value)).toBe(true);
    expect(Math.abs(next.value)).toBeLessThan(2);
  });
});

describe("projection de l'élan", () => {
  it("reprend la formule d'Apple", () => {
    expect(project(1000, 0.99)).toBeCloseTo(99, 5);
    expect(project(-500, 0.998)).toBeCloseTo(-249.5, 5);
    expect(project(0)).toBe(0);
  });
});

describe("résistance en bout de course", () => {
  it("suit de moins en moins, sans jamais atteindre la dimension", () => {
    const small = rubberband(10, 600);
    const large = rubberband(1000, 600);
    expect(small).toBeGreaterThan(5);
    expect(large).toBeLessThan(600);
    expect(large / 1000).toBeLessThan(small / 10);
    expect(rubberband(-100, 600)).toBeCloseTo(-rubberband(100, 600));
  });
});

describe("vitesse du doigt", () => {
  it("lit la pente des derniers points", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(10, 16);
    tracker.add(20, 32);
    expect(tracker.velocity(32)).toBeCloseTo(625, 0);
  });

  it("vaut 0 quand le doigt s'est arrêté avant de se lever", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(50, 16);
    expect(tracker.velocity(400)).toBe(0);
  });
});

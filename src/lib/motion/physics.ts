/**
 * Physique du mouvement de la vitrine — pur, sans DOM.
 *
 * Trois outils, repris des interfaces d'Apple (« Designing Fluid Interfaces », WWDC 2018) :
 *
 *   · un **ressort** réglé par deux nombres lisibles, l'amortissement et la réponse, au lieu du
 *     triplet masse / raideur / frottement. Un ressort n'a pas de durée : il part de la valeur
 *     affichée, avec la vitesse du doigt, et peut être repris en main à tout instant ;
 *   · une **projection** de l'élan : on vise là où le geste allait, pas là où le doigt s'est levé ;
 *   · une **résistance** en bout de course : au-delà d'une limite, l'objet suit de moins en moins,
 *     au lieu de s'arrêter net comme un objet figé.
 */

/** Réglage d'un ressort. `damping` 1 = aucun rebond ; `response` en secondes, plus bas = plus vif. */
export interface SpringConfig {
  damping: number;
  response: number;
}

/** Ressort par défaut : aucun rebond, il se pose sans attirer l'œil. */
export const SPRING_SETTLE: SpringConfig = { damping: 1, response: 0.35 };

/**
 * Ressort d'une feuille lâchée avec élan : un soupçon de rebond, mérité par le geste qui l'a
 * lancée (Apple : 0,8 / 0,3 pour un tiroir). Sans élan préalable, un rebond paraît gratuit.
 */
export const SPRING_FLICK: SpringConfig = { damping: 0.86, response: 0.32 };

export interface SpringState {
  value: number;
  /** Unités par seconde. */
  velocity: number;
}

/**
 * Avance un ressort de `dt` secondes vers `target`.
 *
 * Masse unitaire : raideur = (2π / réponse)², frottement = 4π · amortissement / réponse.
 * Intégration semi-implicite par pas de 4 ms au plus, stable même quand une image saute.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dt: number,
  { damping, response }: SpringConfig,
): SpringState {
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  let { value, velocity } = state;
  let remaining = Math.min(dt, 0.064);
  while (remaining > 0) {
    const h = Math.min(remaining, 0.004);
    const acceleration = -stiffness * (value - target) - friction * velocity;
    velocity += acceleration * h;
    value += velocity * h;
    remaining -= h;
  }
  return { value, velocity };
}

/** Le ressort est posé : assez près de sa cible, et assez lent, pour qu'un œil n'y voie plus rien. */
export function springAtRest(state: SpringState, target: number, precision = 0.001): boolean {
  return Math.abs(state.value - target) < precision && Math.abs(state.velocity) < precision * 10;
}

/**
 * Distance parcourue par un élan qui décroît de façon exponentielle — la fonction qu'Apple livre
 * dans son code d'exemple (et non le `v² / 2a` des manuels).
 *
 * @param velocity unités par seconde
 * @param decelerationRate 0,998 = défilement ordinaire ; 0,99 = plus vif
 */
export function project(velocity: number, decelerationRate = 0.99): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Résistance en bout de course : plus on tire au-delà de la limite, moins l'objet suit.
 * Tend vers `dimension` sans jamais l'atteindre.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  const sign = Math.sign(overshoot);
  const distance = Math.abs(overshoot);
  return (sign * (distance * dimension * constant)) / (dimension + constant * distance);
}

/**
 * Vitesse d'un doigt, lue sur ses derniers points plutôt que sur le dernier seul : un seul écart
 * entre deux événements est trop bruité pour décider d'une fermeture.
 */
export class VelocityTracker {
  private samples: { value: number; time: number }[] = [];

  constructor(private readonly windowMs = 100) {}

  reset(): void {
    this.samples = [];
  }

  add(value: number, time: number): void {
    this.samples.push({ value, time });
    const oldest = time - this.windowMs;
    while (this.samples.length > 2 && this.samples[0]!.time < oldest) this.samples.shift();
  }

  /** Unités par seconde ; 0 quand le doigt s'est arrêté avant de se lever. */
  velocity(now: number): number {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last || last === first) return 0;
    if (now - last.time > this.windowMs) return 0;
    const elapsed = last.time - first.time;
    return elapsed > 0 ? ((last.value - first.value) / elapsed) * 1000 : 0;
  }
}

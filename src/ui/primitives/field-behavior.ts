import type { FocusEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/** Le clavier iOS met ~300 ms à monter : défiler avant, c'est défiler à côté. */
const KEYBOARD_RISE_DELAY_MS = 320;

/** Part de l'écran masquée par le clavier, telle que la pose le service viewport du shell (0 sans clavier). */
function keyboardInset(): number {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--admin-keyboard-inset"));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Premier ancêtre qui défile verticalement (zone de défilement de la page, corps d'une sheet). */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Centre le champ une fois le clavier monté (désactivable dans une liste fenêtrée).
 *
 * Clavier ouvert, le viewport de mise en page ne rétrécit pas (iOS) : « centrer » dans la zone de
 * défilement plaçait le champ au milieu de l'écran ENTIER, donc sous le clavier sur un petit iPhone
 * (bas du champ à 250 px, clavier à 232 px sur 320 × 568). On centre alors dans la part restée visible,
 * entre le haut de la zone de défilement et le haut du clavier, en ne faisant défiler que cette zone :
 * `scrollIntoView` faisait aussi défiler les ancêtres, et le viewport visuel avec eux.
 */
export function scrollFieldIntoView(e: FocusEvent<HTMLElement>): void {
  const el = e.currentTarget;
  window.setTimeout(() => {
    try {
      const inset = keyboardInset();
      const scroller = inset > 0 ? scrollParentOf(el) : null;
      if (!scroller) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      const field = el.getBoundingClientRect();
      const top = Math.max(0, scroller.getBoundingClientRect().top);
      const bottom = Math.min(scroller.getBoundingClientRect().bottom, window.innerHeight - inset);
      const delta = field.top + field.height / 2 - (top + bottom) / 2;
      if (Math.abs(delta) > 1) scroller.scrollBy({ top: delta, behavior: "smooth" });
    } catch {
      /* moteurs anciens : sans conséquence */
    }
  }, KEYBOARD_RISE_DELAY_MS);
}

/**
 * Touche Entrée d'un `<input>` selon son `enterKeyHint` (06 §4.5) :
 * - `next` : champ suivant du formulaire, sinon ferme le clavier ;
 * - `go` / `send` : soumet le formulaire (le clavier affiche « OK » / « Envoyer ») ;
 * - `done`, `search`, `enter` ou rien : ferme le clavier SANS soumettre — le
 *   dernier champ d'un formulaire de page n'envoie jamais rien par accident.
 */
export function handleEnterKey(e: KeyboardEvent<HTMLInputElement>, hint: string | undefined): void {
  if (e.defaultPrevented || e.key !== "Enter") return;
  const input = e.currentTarget;
  if (hint === "next") {
    e.preventDefault();
    const form = input.form;
    if (form) {
      const fields = Array.from(
        form.querySelectorAll<HTMLElement>(
          "input:not([disabled]):not([type=hidden]), textarea:not([disabled]), select:not([disabled])",
        ),
      );
      const next = fields[fields.indexOf(input) + 1];
      if (next) {
        next.focus();
        return;
      }
    }
    input.blur();
    return;
  }
  if ((hint === "go" || hint === "send") && input.form) {
    e.preventDefault();
    input.blur();
    input.form.requestSubmit();
    return;
  }
  e.preventDefault();
  input.blur();
}

/** Apparence commune des champs (Input, Textarea, MoneyInput). */
export function fieldClass(variant: "default" | "elevated" = "default"): string {
  return cn(
    "admin-type-field admin-transition block w-full min-h-[var(--admin-touch-min)] rounded-[var(--admin-radius-md)] px-4",
    "border border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-subtle)]",
    variant === "elevated" ? "shadow-[inset_0_0_0_1px_var(--admin-border)]" : null,
    "mouse-hover:border-[var(--admin-border-hover)]",
    "focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
    "aria-[invalid=true]:border-[var(--admin-danger)] aria-[invalid=true]:focus-visible:ring-[var(--admin-danger-bg)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );
}

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { eurFromWire, formatEur, spokenEur, type MoneyString } from "@/domain/money";
import { Money } from "../Money";

const wire = (v: string) => v as MoneyString;
const render = (node: React.ReactElement) => renderToStaticMarkup(node);

/*
 * Le formatage lui-même est testé par le module monétaire
 * (src/domain/__tests__/money.test.ts). Ici : que `Money` n'en invente pas un
 * second, et qu'il porte ce que 05 §3.2 et §6 exigent.
 */
describe("<Money />", () => {
  it("affiche exactement formatEur, depuis une MoneyString comme depuis un Eur", () => {
    const expected = formatEur(eurFromWire(wire("1234.50")));
    expect(render(<Money value={wire("1234.50")} />)).toContain(expected);
    expect(render(<Money value={eurFromWire(wire("1234.50"))} />)).toContain(expected);
  });

  it("transmet compact et signed au module monétaire", () => {
    const v = wire("50.00");
    expect(render(<Money value={v} compact />)).toContain(formatEur(eurFromWire(v), { compact: true }));
    expect(render(<Money value={v} signed />)).toContain(formatEur(eurFromWire(v), { signed: true }));
  });

  it("chiffres tabulaires, sans retour à la ligne", () => {
    const html = render(<Money value={wire("12.00")} />);
    expect(html).toMatch(/class="[^"]*\btnum\b/);
    expect(html).toMatch(/whitespace-nowrap/);
  });

  it("VoiceOver lit le montant en toutes lettres, le visuel lui est masqué", () => {
    const v = wire("1234.50");
    const html = render(<Money value={v} />);
    expect(html).toContain(`<span class="sr-only">${spokenEur(eurFromWire(v))}</span>`);
    expect(html).toMatch(/<span aria-hidden="true">/);
  });

  it("warning est le ton d'un montant non reçu ; pas de ton automatique vert/rouge", () => {
    expect(render(<Money value={wire("80.00")} tone="warning" />)).toContain("text-[var(--admin-warning)]");
    // Un positif n'est pas vert par défaut (05 §2.1).
    expect(render(<Money value={wire("80.00")} />)).toContain("text-[var(--admin-text)]");
    expect(render(<Money value={wire("-80.00")} />)).not.toContain("--admin-danger");
  });

  it("inherit laisse la couleur au parent (fonds pleins)", () => {
    expect(render(<Money value={wire("1.00")} tone="inherit" />)).not.toMatch(/text-\[var/);
  });
});

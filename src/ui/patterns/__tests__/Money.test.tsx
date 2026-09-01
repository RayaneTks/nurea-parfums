import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Money } from "../Money";

function render(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

describe("<Money />", () => {
  it("formats number 1234.56 → 1 234,56 €", () => {
    const html = render(<Money value={1234.56} />);
    expect(html).toMatch(/1\s?234,56/);
    expect(html).toMatch(/€/);
  });

  it("accepts string with comma decimal", () => {
    const html = render(<Money value="12,50" />);
    expect(html).toMatch(/12,50/);
  });

  it("renders 0,00 € for null/undefined", () => {
    expect(render(<Money value={null} />)).toMatch(/0,00/);
    expect(render(<Money value={undefined} />)).toMatch(/0,00/);
  });

  /*
   * `compact` masque les centimes NULS, jamais des centimes réels.
   *
   * Il les arrondissait, et c'est une chose qu'on ne peut pas se permettre sur
   * un écran où des montants s'additionnent à l'œil. La compta affiche
   * « Encaissé = tant en ventes + tant en commandes » : avec deux composantes
   * à 100,40 € arrondies, la ligne lit « 100 € + 100 € = 201 € », et le gérant
   * cherche l'euro manquant. Un montant qu'on rapproche de son relevé bancaire
   * ne s'arrondit pas.
   */
  it("compact masque les centimes nuls", () => {
    const html = render(<Money value={1234} compact />);
    expect(html).not.toMatch(/,00/);
    expect(html).toMatch(/1\s?234/);
  });

  it("compact garde les centimes réels", () => {
    const html = render(<Money value={1234.56} compact />);
    expect(html).toMatch(/1\s?234,56/);
  });

  it("les composantes d'une somme restent additionnables", () => {
    // Le cas qui a motivé la règle : deux moitiés et leur total.
    const moitie = render(<Money value={100.4} compact />);
    const total = render(<Money value={200.8} compact />);
    expect(moitie).toMatch(/100,40/);
    expect(total).toMatch(/200,80/);
  });

  it("signed adds + on positive", () => {
    const html = render(<Money value={50} signed />);
    expect(html).toMatch(/\+/);
  });

  it("negative shows minus", () => {
    const html = render(<Money value={-30} />);
    expect(html).toMatch(/−30,00|-30,00/);
  });

  it("auto tone picks success/danger/muted", () => {
    expect(render(<Money value={10} tone="auto" />)).toMatch(/text-\[var\(--admin-success\)\]|success/);
    expect(render(<Money value={-10} tone="auto" />)).toMatch(/text-\[var\(--admin-danger\)\]|danger/);
    expect(render(<Money value={0} tone="auto" />)).toMatch(/text-\[var\(--admin-text-muted\)\]|muted/);
  });
});

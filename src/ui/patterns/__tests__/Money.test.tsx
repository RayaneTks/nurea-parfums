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

  it("compact mode strips cents", () => {
    const html = render(<Money value={1234.56} compact />);
    expect(html).not.toMatch(/,56/);
    expect(html).toMatch(/1\s?235|1\s?234/); // rounding behavior
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

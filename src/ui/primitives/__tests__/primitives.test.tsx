import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { eurFromWire, type MoneyString } from "@/domain/money";
import { initials } from "../Avatar";
import { Button } from "../Button";
import { Chip } from "../Chip";
import { EmptyState } from "../EmptyState";
import { ListRow } from "../ListRow";
import { amountToInputText, exceedsMax, sanitizeMoneyText } from "../MoneyInput";
import { StickyAction } from "../StickyAction";
import { SWIPE_ACTION_WIDTH, elasticOffset, settleSwipe } from "../SwipeableRow";
import { Toast } from "../Toast";

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
const eurOf = (v: string) => eurFromWire(v as MoneyString);

describe("Toast — portalisé (05 §3.1)", () => {
  it("rien dans le rendu serveur : le toast n'existe que dans le portail vers <body>, après hydratation", () => {
    expect(render(<Toast message="Ligne supprimée" actionLabel="Annuler" onAction={() => {}} onClose={() => {}} />)).toBe("");
  });
});

describe("Button", () => {
  it("expose sa variante : le test d'affichage compte les primary visibles", () => {
    expect(render(<Button>Encaisser</Button>)).toContain('data-variant="primary"');
    expect(render(<Button variant="secondary">Relancer</Button>)).toContain('data-variant="secondary"');
  });

  it("icône seule : nom accessible et carré de 44 px", () => {
    const html = render(
      <Button iconOnly ariaLabel="Masquer Sauvage" variant="ghost">
        <svg />
      </Button>,
    );
    expect(html).toContain('aria-label="Masquer Sauvage"');
    expect(html).toContain("min-w-[var(--admin-touch-min)]");
    expect(html).toContain("min-h-[var(--admin-touch-min)]");
  });

  it("isLoading : occupé, inerte", () => {
    const html = render(<Button isLoading>Encaisser</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
  });

  it("le type impose ariaLabel à un bouton icône seule", () => {
    // @ts-expect-error — `ariaLabel` manquant
    const node = <Button iconOnly>{"×"}</Button>;
    expect(node).toBeTruthy();
  });
});

describe("Chip", () => {
  it("un filtre à compteur 0 ne se rend pas (05 §5.3)", () => {
    expect(render(<Chip count={0}>Rupture</Chip>)).toBe("");
    expect(render(<Chip count={2}>Rupture</Chip>)).toContain("(2)");
  });
});

describe("EmptyState", () => {
  it("« tout est fait » : une ligne calme, sans bouton", () => {
    const html = render(<EmptyState done title="Rien à encaisser." />);
    expect(html).toContain("Rien à encaisser.");
    expect(html).not.toContain("<button");
  });

  it("le type impose l'action suivante hors « tout est fait »", () => {
    // @ts-expect-error — `action` manquante
    const node = <EmptyState title="Aucune commande" />;
    expect(node).toBeTruthy();
  });
});

describe("ListRow", () => {
  it("un contrôle en trailing n'est jamais imbriqué dans la zone pressable", () => {
    const html = render(
      <ListRow
        onClick={() => undefined}
        primary="Vente du 3 août"
        trailing={<button type="button">80 €</button>}
      />,
    );
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*<button/);
    expect(html).toContain("admin-row-press");
  });
});

describe("StickyAction", () => {
  it("ligne de résumé au-dessus du bouton, tronquée", () => {
    const html = render(
      <StickyAction summary="Espèces · 70 € resteront à encaisser">
        <Button>Encaisser 50 €</Button>
      </StickyAction>,
    );
    expect(html).toContain("data-sticky-action");
    expect(html.indexOf("Espèces")).toBeLessThan(html.indexOf("Encaisser 50"));
    expect(html).toMatch(/class="[^"]*truncate[^"]*">Espèces/);
  });
});

describe("Avatar — initiales", () => {
  it("accents conservés, même saisis décomposés", () => {
    expect(initials("Émilie Durand")).toBe("ÉD");
    expect(initials("Émilie Durand")).toBe("ÉD");
    expect(initials("fares")).toBe("FA");
    expect(initials("@snap_lina")).toBe("SN");
    expect(initials("   ")).toBe("?");
  });
});

describe("SwipeableRow — le glissement révèle, le tap exécute", () => {
  const both = { left: true, right: true };

  it("suit le doigt jusqu'à la largeur de l'action, puis résiste", () => {
    expect(elasticOffset(40, both)).toBe(40);
    expect(elasticOffset(SWIPE_ACTION_WIDTH + 40, both)).toBe(SWIPE_ACTION_WIDTH + 10);
    expect(elasticOffset(-(SWIPE_ACTION_WIDTH + 40), both)).toBe(-(SWIPE_ACTION_WIDTH + 10));
  });

  it("aucun déplacement du côté sans action", () => {
    expect(elasticOffset(60, { left: false, right: true })).toBe(0);
    expect(elasticOffset(-60, { left: true, right: false })).toBe(0);
  });

  it("s'ouvre passé la moitié, se referme sinon — jamais d'exécution", () => {
    expect(settleSwipe(SWIPE_ACTION_WIDTH / 2)).toBe("left");
    expect(settleSwipe(-SWIPE_ACTION_WIDTH)).toBe("right");
    expect(settleSwipe(SWIPE_ACTION_WIDTH / 2 - 1)).toBe("closed");
  });
});

describe("MoneyInput — texte ↔ montant", () => {
  it("un raccourci s'écrit comme on le taperait", () => {
    expect(amountToInputText(eurOf("120.00"))).toBe("120");
    expect(amountToInputText(eurOf("37.50"))).toBe("37,50");
    expect(amountToInputText(eurOf("-3.50"))).toBe("−3,50");
  });

  it("ne garde que ce qu'un montant peut contenir", () => {
    expect(sanitizeMoneyText("12,5 €")).toBe("12,5 ");
    expect(sanitizeMoneyText("-3")).toBe("3");
    expect(sanitizeMoneyText("-3", true)).toBe("-3");
  });

  it("plafond", () => {
    expect(exceedsMax(eurOf("80.01"), eurOf("80.00"))).toBe(true);
    expect(exceedsMax(eurOf("80.00"), eurOf("80.00"))).toBe(false);
    expect(exceedsMax(null, eurOf("80.00"))).toBe(false);
    expect(exceedsMax(eurOf("1000.00"), undefined)).toBe(false);
  });
});

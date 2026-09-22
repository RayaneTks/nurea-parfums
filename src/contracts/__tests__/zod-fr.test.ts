import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldMessages } from "../zod-fr";

const firstMessage = (schema: z.ZodTypeAny, value: unknown) => {
  const r = schema.safeParse(value);
  return r.success ? null : r.error.issues[0]?.message;
};

describe("carte d'erreurs zod en français", () => {
  it("champ requis, nombre, texte trop long", () => {
    expect(firstMessage(z.string(), undefined)).toBe("Remplis ce champ.");
    expect(firstMessage(z.number(), "abc")).toBe("Saisis un nombre.");
    expect(firstMessage(z.string().max(40), "x".repeat(41))).toBe("Raccourcis ce texte : 40 caractères au plus.");
    expect(firstMessage(z.string().min(1), "")).toBe("Remplis ce champ.");
  });

  it("bornes numériques, listes et choix", () => {
    expect(firstMessage(z.number().int().min(1), 0)).toBe("Indique un nombre supérieur ou égal à 1.");
    expect(firstMessage(z.number().positive(), 0)).toBe("Indique un nombre supérieur à 0.");
    expect(firstMessage(z.array(z.string()).min(1), [])).toBe("Ajoute au moins un élément.");
    expect(firstMessage(z.enum(["CASH", "BANK"]), "X")).toBe("Choisis une des options proposées.");
  });

  it("un message écrit dans le schéma reste prioritaire", () => {
    expect(firstMessage(z.string().min(1, "Indique un nom."), "")).toBe("Indique un nom.");
  });

  it("fieldMessages : un message par chemin, le premier", () => {
    const schema = z.object({
      lines: z.array(z.object({ unitPriceEur: z.string().min(1, "Indique un prix pour cette ligne, ou coche Offert.") })),
      name: z.string().min(2).max(3),
    });
    const r = schema.safeParse({ lines: [{ unitPriceEur: "" }], name: "a" });
    expect(r.success).toBe(false);
    expect(fieldMessages(r.error!)).toEqual({
      "lines.0.unitPriceEur": "Indique un prix pour cette ligne, ou coche Offert.",
      name: "Saisis au moins 2 caractères.",
    });
  });
});

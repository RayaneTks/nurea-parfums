import { describe, expect, it } from "vitest";
import {
  ELAPSED_FIELD,
  HONEYPOT_FIELD,
  MAX_LENGTHS,
  inspectContactForm,
  multiLine,
  singleLine,
} from "../guard";

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    name: "Camille Roux",
    email: "camille@example.com",
    subject: "Commander — Nuréa",
    message: "Bonjour, je souhaite commander ce parfum.",
    [ELAPSED_FIELD]: "8000",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("inspectContactForm", () => {
  it("accepte un message ordinaire", () => {
    const verdict = inspectContactForm(form());
    expect(verdict.kind).toBe("ok");
    expect(verdict.kind === "ok" && verdict.fields.name).toBe("Camille Roux");
  });

  it("jette en silence ce qui remplit le leurre", () => {
    expect(inspectContactForm(form({ [HONEYPOT_FIELD]: "Acme SARL" }))).toEqual({
      kind: "discard",
      reason: "honeypot",
    });
  });

  it("jette en silence ce qui est posté trop vite", () => {
    expect(inspectContactForm(form({ [ELAPSED_FIELD]: "120" })).kind).toBe("discard");
  });

  it("jette en silence ce qui n'annonce aucun temps de saisie", () => {
    const data = form();
    data.delete(ELAPSED_FIELD);
    expect(inspectContactForm(data)).toEqual({ kind: "discard", reason: "trop-rapide" });
  });

  it("le refus silencieux ne nomme jamais ce qui a trahi l'envoi", () => {
    const verdict = inspectContactForm(form({ [HONEYPOT_FIELD]: "x" }));
    expect(verdict.kind).toBe("discard");
    expect(verdict).not.toHaveProperty("error");
  });

  it.each([
    ["name", "Indiquez votre nom."],
    ["email", "Indiquez votre e-mail."],
    ["subject", "Indiquez un sujet."],
    ["message", "Écrivez votre message."],
  ])("refuse un %s vide, et le dit", (field, message) => {
    expect(inspectContactForm(form({ [field]: "   " }))).toEqual({ kind: "invalid", error: message });
  });

  it("refuse une adresse mal formée", () => {
    expect(inspectContactForm(form({ email: "camille@example" })).kind).toBe("invalid");
  });

  it("refuse un dépôt de texte", () => {
    expect(inspectContactForm(form({ message: "a".repeat(MAX_LENGTHS.message + 1) })).kind).toBe("invalid");
    expect(inspectContactForm(form({ subject: "a".repeat(MAX_LENGTHS.subject + 1) })).kind).toBe("invalid");
    expect(inspectContactForm(form({ name: "a".repeat(MAX_LENGTHS.name + 1) })).kind).toBe("invalid");
  });

  it("désamorce une injection d'en-tête dans le sujet", () => {
    const verdict = inspectContactForm(form({ subject: "Commande\r\nBcc: victime@example.com" }));
    expect(verdict.kind).toBe("ok");
    expect(verdict.kind === "ok" && verdict.fields.subject).toBe("Commande Bcc: victime@example.com");
  });

  it("désamorce une injection d'en-tête dans le nom et l'adresse", () => {
    const verdict = inspectContactForm(form({ name: "Eve\nBcc: x@y.z", email: " camille@example.com\r\n" }));
    expect(verdict.kind === "ok" && verdict.fields.name).toBe("Eve Bcc: x@y.z");
    expect(verdict.kind === "ok" && verdict.fields.email).toBe("camille@example.com");
  });

  it("garde les paragraphes du message", () => {
    const verdict = inspectContactForm(form({ message: "Bonjour,\r\n\r\nDeux lignes." }));
    expect(verdict.kind === "ok" && verdict.fields.message).toBe("Bonjour,\n\nDeux lignes.");
  });
});

describe("singleLine / multiLine", () => {
  it("singleLine écrase tout blanc en une espace", () => {
    expect(singleLine("  a\t\tb \r\n c  ")).toBe("a b c");
  });

  it("multiLine retire les caractères de contrôle sans toucher aux sauts de ligne", () => {
    expect(multiLine("a\u0000b\nc")).toBe("ab\nc");
  });
});

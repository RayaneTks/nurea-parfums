import { describe, expect, it } from "vitest";
import repertoire from "../repertoire-parfums.json";
import { searchRepertoire } from "../searchRepertoire";

type Entry = { brand: string; line?: string; name: string; aliases?: string[] };
const entries = repertoire as Entry[];

describe("répertoire des parfums existants", () => {
  it("est propre : marque et nom renseignés, sans espace parasite, sans doublon", () => {
    const keys = new Set<string>();
    for (const e of entries) {
      expect(e.brand.trim()).toBe(e.brand);
      expect(e.name.trim()).toBe(e.name);
      expect(e.brand).not.toBe("");
      expect(e.name).not.toBe("");
      const key = `${e.brand}|${e.name}`.toLowerCase();
      expect(keys.has(key), key).toBe(false);
      keys.add(key);
    }
    expect(entries.length).toBeGreaterThan(3000);
  });

  it("emploie les noms de marque du catalogue", () => {
    const brands = new Set(entries.map((e) => e.brand));
    for (const ours of ["Giorgio Armani", "Rabanne", "Jo Malone", "Yves Saint Laurent", "Dior"]) {
      expect(brands.has(ours), ours).toBe(true);
    }
    for (const old of ["Armani", "Paco Rabanne", "Jo Malone London"]) expect(brands.has(old), old).toBe(false);
  });

  it("reconnaît un parfum absent du catalogue, fautes et graphies courantes comprises", () => {
    expect(searchRepertoire("sauvage elixir")).toMatchObject({ brand: "Dior", on: "perfume" });
    expect(searchRepertoire("baccarat rouge")).toMatchObject({ brand: "Maison Francis Kurkdjian" });
    expect(searchRepertoire("khamrah")).toMatchObject({ brand: "Lattafa" });
  });

  it("une saisie qui ne vise que la marque parle de la marque", () => {
    expect(searchRepertoire("lattafa")).toMatchObject({ brand: "Lattafa", on: "brand" });
  });

  it("rien pour une saisie qui n'est pas un parfum", () => {
    expect(searchRepertoire("zzqxw")).toBeNull();
  });
});

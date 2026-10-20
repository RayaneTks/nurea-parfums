import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SELECTION_CHANGE_EVENT,
  SELECTION_KEY,
  parseSelection,
  readSelectionRaw,
  toggleId,
  toggleSelection,
} from "../selection";

describe("parseSelection", () => {
  it("garde les identifiants entiers, sans doublon", () => {
    expect(parseSelection("[3, 7, 3, \"x\", 1.5, null]")).toEqual([3, 7]);
  });

  it("vaut liste vide pour une valeur absente, cassée ou d'une autre forme", () => {
    expect(parseSelection(null)).toEqual([]);
    expect(parseSelection("{pas du json")).toEqual([]);
    expect(parseSelection("{\"ids\":[1]}")).toEqual([]);
  });
});

describe("toggleId", () => {
  it("ajoute puis retire", () => {
    expect(toggleId([1], 2)).toEqual([1, 2]);
    expect(toggleId([1, 2], 1)).toEqual([2]);
  });
});

describe("écriture sur l'appareil", () => {
  afterEach(() => vi.unstubAllGlobals());

  const stubStorage = (store: Map<string, string>, failing = false) => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => {
        if (failing) throw new Error("bloqué");
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (failing) throw new Error("bloqué");
        store.set(key, value);
      },
    });
    const events: string[] = [];
    vi.stubGlobal("window", { dispatchEvent: (event: Event) => events.push(event.type) });
    vi.stubGlobal("CustomEvent", class extends Event {});
    return events;
  };

  it("ajoute, retire, et prévient l'onglet courant à chaque écriture", () => {
    const store = new Map<string, string>();
    const events = stubStorage(store);
    toggleSelection(4);
    toggleSelection(9);
    expect(parseSelection(store.get(SELECTION_KEY) ?? null)).toEqual([4, 9]);
    toggleSelection(4);
    expect(readSelectionRaw()).toBe("[9]");
    expect(events).toEqual([SELECTION_CHANGE_EVENT, SELECTION_CHANGE_EVENT, SELECTION_CHANGE_EVENT]);
  });

  it("stockage refusé (navigation privée stricte) : liste vide, aucune erreur, aucun événement", () => {
    const events = stubStorage(new Map(), true);
    expect(readSelectionRaw()).toBe("[]");
    expect(() => toggleSelection(1)).not.toThrow();
    expect(events).toEqual([]);
  });
});

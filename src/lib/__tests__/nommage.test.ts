import { describe, expect, it } from "vitest";
import { casseNomPropre, cleNom, normaliseMarque, trouveParNom } from "../nommage";

describe("cleNom", () => {
  it("rapproche les graphies d'un même nom", () => {
    const attendu = cleNom("Louis Vuitton");
    expect(cleNom("louis vuitton")).toBe(attendu);
    expect(cleNom("LOUIS VUITTON")).toBe(attendu);
    expect(cleNom("  Louis   Vuitton  ")).toBe(attendu);
    expect(cleNom("Louis-Vuitton")).toBe(attendu);
  });

  it("ignore les accents et la ponctuation", () => {
    expect(cleNom("L'Immensité")).toBe(cleNom("l immensite"));
    expect(cleNom("Dolce & Gabbana")).toBe(cleNom("dolce gabbana"));
    expect(cleNom("Joop!")).toBe(cleNom("joop"));
  });

  it("ne rapproche PAS deux marques différentes", () => {
    expect(cleNom("Lancôme")).not.toBe(cleNom("Lanvin"));
    // Le bug historique mangeait les lettres doublées : la clé ne doit surtout
    // pas le reproduire, sinon Azzaro et Azaro seraient confondus.
    expect(cleNom("Azzaro")).not.toBe(cleNom("Azaro"));
  });
});

describe("casseNomPropre — saisie sans casse", () => {
  it("met en forme une saisie tout en minuscules", () => {
    expect(casseNomPropre("louis vuitton")).toBe("Louis Vuitton");
    expect(casseNomPropre("jean paul gaultier")).toBe("Jean Paul Gaultier");
  });

  it("met en forme une saisie tout en majuscules", () => {
    expect(casseNomPropre("YVES SAINT LAURENT")).toBe("Yves Saint Laurent");
    expect(casseNomPropre("OMBRE NOMADE")).toBe("Ombre Nomade");
  });

  it("laisse les mots-outils en bas de casse au milieu", () => {
    expect(casseNomPropre("acqua di gio")).toBe("Acqua di Gio");
    expect(casseNomPropre("THE ONE FOR MEN")).toBe("The One for Men");
    expect(casseNomPropre("light blue pour homme")).toBe("Light Blue pour Homme");
  });

  it("garde la majuscule d'un mot-outil en tête et en fin", () => {
    expect(casseNomPropre("the one")).toBe("The One");
    expect(casseNomPropre("nuit de feu")).toBe("Nuit de Feu");
  });

  it("coupe aux traits d'union", () => {
    expect(casseNomPropre("attrape-reves")).toBe("Attrape-Reves");
    expect(casseNomPropre("MARC-ANTOINE BARROIS")).toBe("Marc-Antoine Barrois");
  });

  it("capitalise après un article élidé, mais pas ailleurs", () => {
    expect(casseNomPropre("l'interdit")).toBe("L'Interdit");
    expect(casseNomPropre("l'immensite")).toBe("L'Immensite");
    // Dior écrit « J'adore », pas « J'Adore ».
    expect(casseNomPropre("j'adore")).toBe("J'adore");
  });

  it("garde l'esperluette", () => {
    expect(casseNomPropre("dolce & gabbana")).toBe("Dolce & Gabbana");
  });

  it("ne touche pas aux jetons contenant un chiffre", () => {
    expect(casseNomPropre("212 vip")).toBe("212 VIP");
    expect(casseNomPropre("1 million elixir")).toBe("1 Million Elixir");
    expect(casseNomPropre("l.12.12 blanc")).toBe("l.12.12 Blanc");
  });

  it("garde les sigles connus en capitales", () => {
    expect(casseNomPropre("LE MALE JPG")).toBe("Le Male JPG");
    expect(casseNomPropre("pure xs")).toBe("Pure XS");
  });

  it("normalise les espaces", () => {
    expect(casseNomPropre("  ombre    nomade ")).toBe("Ombre Nomade");
  });
});

describe("casseNomPropre — saisie déjà cassée", () => {
  /*
   * Le garde-fou du fichier : une saisie mixte porte une intention. La
   * recasser détruirait les stylisations réelles des maisons.
   */
  it("respecte une saisie mixte", () => {
    expect(casseNomPropre("eLVes")).toBe("eLVes");
    expect(casseNomPropre("DGVIB3")).toBe("DGVIB3");
    expect(casseNomPropre("J'adore Eau Lumière")).toBe("J'adore Eau Lumière");
    expect(casseNomPropre("Fan di Fendi")).toBe("Fan di Fendi");
    expect(casseNomPropre("iPhone")).toBe("iPhone");
  });

  it("nettoie tout de même les espaces d'une saisie mixte", () => {
    expect(casseNomPropre("  Ombre   Nomade ")).toBe("Ombre Nomade");
  });
});

describe("trouveParNom", () => {
  const marques = [
    { id: "1", name: "Louis Vuitton" },
    { id: "2", name: "Dolce & Gabbana" },
    { id: "3", name: "Lancôme" },
  ];
  const nomDe = (b: { name: string }) => b.name;

  it("retrouve une marque quelle que soit la graphie tapée", () => {
    expect(trouveParNom(marques, nomDe, "louis vuitton")?.id).toBe("1");
    expect(trouveParNom(marques, nomDe, "LOUIS VUITTON")?.id).toBe("1");
    expect(trouveParNom(marques, nomDe, "dolce gabbana")?.id).toBe("2");
    expect(trouveParNom(marques, nomDe, "lancome")?.id).toBe("3");
  });

  it("ne retourne rien pour une marque absente", () => {
    expect(trouveParNom(marques, nomDe, "Creed")).toBeUndefined();
    expect(trouveParNom(marques, nomDe, "")).toBeUndefined();
  });
});

describe("normaliseMarque", () => {
  it("est ce qui empêche les marques en double", () => {
    // Les trois graphies qui créaient trois marques distinctes en base.
    const graphies = ["Louis Vuitton", "louis vuitton", "LOUIS VUITTON"];
    const normalisees = new Set(graphies.map(normaliseMarque));
    expect(normalisees).toEqual(new Set(["Louis Vuitton"]));
  });
});

describe("casseNomPropre — capitales ambiguës", () => {
  /*
   * Le contre-exemple qui a fait resserrer la règle. « MYSLF » est le nom réel
   * du parfum d'Yves Saint Laurent, trouvé tel quel en base : le passer en
   * casse de titre inventait « Myslf ».
   */
  it("laisse intact un mot seul tout en capitales", () => {
    expect(casseNomPropre("MYSLF")).toBe("MYSLF");
    expect(casseNomPropre("LVERS")).toBe("LVERS");
    expect(casseNomPropre("KENZO")).toBe("KENZO");
  });

  it("met en forme des capitales sur plusieurs mots", () => {
    expect(casseNomPropre("OMBRE NOMADE")).toBe("Ombre Nomade");
    expect(casseNomPropre("BLACK OPIUM")).toBe("Black Opium");
  });

  it("met en forme un mot seul en capitales s'il porte une apostrophe ou un tiret", () => {
    // Du français crié, pas un logo.
    expect(casseNomPropre("L'INTERDIT")).toBe("L'Interdit");
    expect(casseNomPropre("ATTRAPE-REVES")).toBe("Attrape-Reves");
  });

  it("met en forme sans condition ce qui est tout en minuscules", () => {
    // Personne ne stylise un parfum en bas de casse : c'est un oubli.
    expect(casseNomPropre("party love")).toBe("Party Love");
    expect(casseNomPropre("myslf")).toBe("Myslf");
  });

  /*
   * Le vrai filet de sécurité : quand la marque existe, on reprend SON
   * orthographe. Les règles de casse ne servent qu'aux noms nouveaux, donc
   * « KENZO » laissé en capitales par prudence retombe quand même sur « Kenzo ».
   */
  it("le catalogue existant l'emporte sur les règles de casse", () => {
    const marques = [{ id: "9", name: "Kenzo" }];
    expect(trouveParNom(marques, (b) => b.name, "KENZO")?.name).toBe("Kenzo");
    expect(trouveParNom(marques, (b) => b.name, "kenzo")?.name).toBe("Kenzo");
  });
});

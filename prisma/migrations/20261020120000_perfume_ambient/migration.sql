-- Couleur d'ambiance d'un parfum (refonte vitrine, docs/refonte-vitrine/04-PLAN-EXECUTION.md § B.3) :
-- teinte dominante du visuel sombre (0–359) et chroma source médiane (0–0,4), calculées hors ligne
-- par scripts/refonte-vitrine/ambiance.mjs. Les deux NULL = repli : la vitrine garde sa surface
-- neutre. Jamais l'une sans l'autre : une teinte sans chroma ne se dessine pas.
-- Les IS NOT NULL sont nécessaires : un CHECK laisse passer un résultat inconnu (NULL), donc
-- « teinte posée, chroma NULL » passerait sans eux.
-- Colonnes neuves, entièrement NULL : la contrainte est valide dès sa pose (pas de NOT VALID).

ALTER TABLE "Perfume" ADD COLUMN "ambientHue" INTEGER;
ALTER TABLE "Perfume" ADD COLUMN "ambientChroma" DECIMAL(4,3);

ALTER TABLE "Perfume" ADD CONSTRAINT perfume_ambient_ck CHECK (
  ("ambientHue" IS NULL AND "ambientChroma" IS NULL)
  OR ("ambientHue" IS NOT NULL AND "ambientChroma" IS NOT NULL
      AND "ambientHue" BETWEEN 0 AND 359 AND "ambientChroma" BETWEEN 0 AND 0.4)
);

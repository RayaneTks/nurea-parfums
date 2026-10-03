-- Gamme d'un parfum : ligne de la marque (« La Collection Privée » chez Dior, « Private Blend »
-- chez Tom Ford). Facultative : NULL = pas de gamme. Une chaîne vide ou blanche n'est jamais une
-- gamme : le contrat la rend NULL, le CHECK refuse toute écriture qui le contournerait.
-- Colonne neuve, entièrement NULL : la contrainte est valide dès sa pose (pas de NOT VALID).

ALTER TABLE "Perfume" ADD COLUMN "line" TEXT;

ALTER TABLE "Perfume" ADD CONSTRAINT perfume_line_ck
  CHECK (line IS NULL OR btrim(line) <> '');

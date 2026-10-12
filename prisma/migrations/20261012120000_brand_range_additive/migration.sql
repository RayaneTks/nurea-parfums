-- Le visuel de gamme complète complète les fiches parfum. Le mode historique ne décide
-- plus de l'affichage et ne doit plus imposer un visuel pour publier une marque.
ALTER TABLE "Brand" DROP CONSTRAINT IF EXISTS brand_complete_logo_ck;
UPDATE "Brand" SET "catalogMode" = 'CURATED' WHERE "catalogMode" = 'COMPLETE';

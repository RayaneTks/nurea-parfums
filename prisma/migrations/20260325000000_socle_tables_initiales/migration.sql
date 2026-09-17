-- Socle historique : les tables que la production a reçues par `prisma db push`, avant
-- toute migration (Brand, Perfume, AdminUser, AuditLog, ExternalImportSuggestion).
--
-- Pourquoi ce dossier existe : la première migration du dépôt
-- (20260326120000_brand_taxonomy) modifie "Brand", qu'aucune migration ne crée. Sans
-- ce socle, l'historique ne se rejoue pas sur une base vide : `prisma migrate reset`
-- (base de test, CI) et `prisma migrate diff --from-migrations` (base shadow) échouent
-- dès la première migration (docs/refonte/07-PLAN-EXECUTION.md §2.1, J1).
--
-- Sans effet sur une base existante : tout est conditionné à l'absence de "Brand".
-- En production (et sur toute copie restaurée), ce dossier est donc un no-op, qu'il
-- soit appliqué par `prisma migrate deploy` ou marqué `migrate resolve --applied`.
--
-- Colonnes : celles que les migrations suivantes lisent ou n'ajoutent pas elles-mêmes
-- (Brand.status et Perfume.status sont indexés par 20260513140000 ; Perfume.stock et
-- Perfume.isPrivate sont ajoutés plus tard et ne figurent donc pas ici). Noms et types
-- : ceux que `prisma db push` produisait depuis le schéma de l'époque.

DO $$
BEGIN
  IF to_regclass('public."Brand"') IS NOT NULL THEN
    RETURN;
  END IF;

  CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');
  CREATE TYPE "BrandCatalogMode" AS ENUM ('CURATED', 'COMPLETE');
  CREATE TYPE "BrandVisibilityStatus" AS ENUM ('PUBLISHED', 'DRAFT');
  CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

  CREATE TABLE "Brand" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "catalogMode" "BrandCatalogMode" NOT NULL DEFAULT 'CURATED',
    "status"      "BrandVisibilityStatus" NOT NULL DEFAULT 'PUBLISHED',
    "image"       TEXT,
    "imageLight"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
  CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

  CREATE TABLE "Perfume" (
    "id"         SERIAL NOT NULL,
    "brandId"    TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "image"      TEXT NOT NULL,
    "imageLight" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status"     "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Perfume_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX "Perfume_slug_key" ON "Perfume"("slug");
  CREATE UNIQUE INDEX "Perfume_brandId_name_key" ON "Perfume"("brandId", "name");
  CREATE INDEX "Perfume_status_idx" ON "Perfume"("status");
  CREATE INDEX "Perfume_brandId_idx" ON "Perfume"("brandId");
  ALTER TABLE "Perfume" ADD CONSTRAINT "Perfume_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

  CREATE TABLE "AdminUser" (
    "id"           TEXT NOT NULL,
    "username"     TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role"         "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
  );
  CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

  CREATE TABLE "AuditLog" (
    "id"        TEXT NOT NULL,
    "actorId"   TEXT,
    "action"    TEXT NOT NULL,
    "entity"    TEXT NOT NULL,
    "entityId"  TEXT,
    "meta"      JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  );
  CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

  CREATE TABLE "ExternalImportSuggestion" (
    "id"           TEXT NOT NULL,
    "externalId"   TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "brand"        TEXT NOT NULL,
    "source"       TEXT,
    "payload"      JSONB,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt"   TIMESTAMP(3),
    "reviewedById" TEXT,
    CONSTRAINT "ExternalImportSuggestion_pkey" PRIMARY KEY ("id")
  );
END $$;

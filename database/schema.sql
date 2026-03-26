-- Nuréa Parfums — schéma PostgreSQL (Neon, Supabase, RDS, etc.)
-- Miroir logique de prisma/schema.prisma — à appliquer avec psql ou via `prisma migrate dev`.
-- Encodage recommandé : UTF-8

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SearchCacheStatus" AS ENUM ('FOUND', 'NOT_FOUND', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ImportSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IMPORTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Marques
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Brand" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"       TEXT NOT NULL UNIQUE,
  "slug"       TEXT NOT NULL UNIQUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Parfums (fiches catalogue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Perfume" (
  "id"         INTEGER NOT NULL PRIMARY KEY,
  "brandId"    TEXT NOT NULL REFERENCES "Brand"("id") ON DELETE RESTRICT,
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL UNIQUE,
  "category"   TEXT NOT NULL,
  "image"      TEXT NOT NULL,
  "imageLight" TEXT,
  "imageDark"  TEXT,
  "status"     "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "Perfume_category_idx" ON "Perfume" ("category");
CREATE INDEX IF NOT EXISTS "Perfume_status_idx" ON "Perfume" ("status");
CREATE INDEX IF NOT EXISTS "Perfume_brandId_idx" ON "Perfume" ("brandId");
CREATE INDEX IF NOT EXISTS "Perfume_name_lower_idx" ON "Perfume" (lower("name"));

-- ---------------------------------------------------------------------------
-- Alias / tags / gammes (classiques) — normalisation recherche
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PerfumeAlias" (
  "id"         TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "perfumeId"  INTEGER NOT NULL REFERENCES "Perfume"("id") ON DELETE CASCADE,
  "alias"      TEXT NOT NULL,
  "normalized" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "PerfumeAlias_perfumeId_idx" ON "PerfumeAlias" ("perfumeId");
CREATE INDEX IF NOT EXISTS "PerfumeAlias_normalized_idx" ON "PerfumeAlias" ("normalized");

CREATE TABLE IF NOT EXISTS "PerfumeTag" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "perfumeId" INTEGER NOT NULL REFERENCES "Perfume"("id") ON DELETE CASCADE,
  "tag"       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "PerfumeTag_perfumeId_idx" ON "PerfumeTag" ("perfumeId");

CREATE TABLE IF NOT EXISTS "PerfumeClassic" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "perfumeId" INTEGER NOT NULL REFERENCES "Perfume"("id") ON DELETE CASCADE,
  "line"      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "PerfumeClassic_perfumeId_idx" ON "PerfumeClassic" ("perfumeId");

-- ---------------------------------------------------------------------------
-- Contenances / images additionnelles / notes olfactives (futur back-office)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "PerfumeSize" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "perfumeId" INTEGER NOT NULL REFERENCES "Perfume"("id") ON DELETE CASCADE,
  "label"     TEXT NOT NULL,
  "sku"       TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "PerfumeSize_perfumeId_idx" ON "PerfumeSize" ("perfumeId");

CREATE TABLE IF NOT EXISTS "PerfumeImage" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "perfumeId" INTEGER NOT NULL REFERENCES "Perfume"("id") ON DELETE CASCADE,
  "url"       TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "alt"       TEXT
);

CREATE INDEX IF NOT EXISTS "PerfumeImage_perfumeId_idx" ON "PerfumeImage" ("perfumeId");

CREATE TABLE IF NOT EXISTS "PerfumeNote" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "perfumeId" INTEGER NOT NULL REFERENCES "Perfume"("id") ON DELETE CASCADE,
  "layer"     TEXT NOT NULL,
  "label"     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS "PerfumeNote_perfumeId_idx" ON "PerfumeNote" ("perfumeId");

-- ---------------------------------------------------------------------------
-- Cache recherche externe (positif + négatif + erreur)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SearchExternalCache" (
  "id"                   TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "rawQuery"             TEXT NOT NULL,
  "normalizedQuery"      TEXT NOT NULL,
  "categoryKey"          TEXT NOT NULL,
  "status"               "SearchCacheStatus" NOT NULL,
  "source"               TEXT,
  "suggestionName"       TEXT,
  "suggestionBrand"      TEXT,
  "suggestionExternalId" TEXT,
  "payload"              JSONB,
  "checkedAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"            TIMESTAMPTZ NOT NULL,
  CONSTRAINT "SearchExternalCache_normalized_category_key" UNIQUE ("normalizedQuery", "categoryKey")
);

CREATE INDEX IF NOT EXISTS "SearchExternalCache_expiresAt_idx" ON "SearchExternalCache" ("expiresAt");

-- ---------------------------------------------------------------------------
-- Administration (futur panel)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email"        TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role"         "AdminRole" NOT NULL DEFAULT 'EDITOR',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actorId"   TEXT REFERENCES "AdminUser"("id") ON DELETE SET NULL,
  "action"    TEXT NOT NULL,
  "entity"    TEXT NOT NULL,
  "entityId"  TEXT,
  "meta"      JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");

CREATE TABLE IF NOT EXISTS "ExternalImportSuggestion" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "externalId"    TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "brand"         TEXT NOT NULL,
  "source"        TEXT,
  "payload"       JSONB,
  "status"        "ImportSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "reviewedAt"    TIMESTAMPTZ,
  "reviewedById"  TEXT
);

CREATE INDEX IF NOT EXISTS "ExternalImportSuggestion_status_idx" ON "ExternalImportSuggestion" ("status");

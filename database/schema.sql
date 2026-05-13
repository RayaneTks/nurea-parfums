-- Nurea Parfums — schema SQL minimal (reset propre)
-- Aligne sur prisma/schema.prisma simplifie.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BrandCatalogMode" AS ENUM ('CURATED', 'COMPLETE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Marques
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Brand" (
  "id"          TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL UNIQUE,
  "slug"        TEXT NOT NULL UNIQUE,
  "catalogMode" "BrandCatalogMode" NOT NULL DEFAULT 'CURATED',
  "image"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Parfums
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Perfume" (
  "id"         SERIAL PRIMARY KEY,
  "brandId"    TEXT NOT NULL REFERENCES "Brand"("id") ON DELETE CASCADE,
  "name"       TEXT NOT NULL,
  "slug"       TEXT NOT NULL UNIQUE,
  "image"      TEXT NOT NULL,
  "imageLight" TEXT,
  "status"     "PublicationStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Perfume_brand_name_key" UNIQUE ("brandId", "name")
);

CREATE INDEX IF NOT EXISTS "Perfume_status_idx" ON "Perfume" ("status");
CREATE INDEX IF NOT EXISTS "Perfume_brandId_idx" ON "Perfume" ("brandId");

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AdminUser" (
  "id"           TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "username"     TEXT NOT NULL UNIQUE,
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

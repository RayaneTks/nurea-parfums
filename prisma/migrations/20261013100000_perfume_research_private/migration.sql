CREATE TYPE "PerfumeResearchSourceType" AS ENUM (
  'BRAND_OFFICIAL',
  'PERFUMER_OFFICIAL',
  'SUPPLIER',
  'LICENSED_DATA_PROVIDER'
);

CREATE TYPE "PerfumeResearchStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "PerfumeResearchRecord" (
  "id" TEXT NOT NULL,
  "brandName" TEXT NOT NULL,
  "perfumeName" TEXT NOT NULL,
  "brandKey" TEXT NOT NULL,
  "perfumeKey" TEXT NOT NULL,
  "line" TEXT,
  "sourceType" "PerfumeResearchSourceType" NOT NULL,
  "sourceUrl" VARCHAR(500) NOT NULL,
  "rightsEvidence" VARCHAR(1000) NOT NULL,
  "retrievedAt" TIMESTAMPTZ(3) NOT NULL,
  "topNotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "heartNotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "baseNotes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "universeCorrection" TEXT,
  "status" "PerfumeResearchStatus" NOT NULL DEFAULT 'PENDING',
  "rightsConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  "reviewNotes" VARCHAR(1000),
  "reviewedAt" TIMESTAMPTZ(3),
  "reviewerId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PerfumeResearchRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "perfume_research_source_url_ck" CHECK (
    "sourceUrl" ~* '^https://' AND
    "sourceUrl" !~* '^https://([^/]+\.)*fragrantica\.[^/]+([/:?#]|$)' AND
    "sourceUrl" !~* '^https://([^/]+\.)*(fimgs\.net|fraguru\.com)([/:?#]|$)'
  ),
  CONSTRAINT "perfume_research_rights_evidence_ck" CHECK (length(btrim("rightsEvidence")) > 0),
  CONSTRAINT "perfume_research_review_ck" CHECK (
    ("status" = 'PENDING' AND "reviewedAt" IS NULL AND "reviewerId" IS NULL) OR
    ("status" IN ('VERIFIED', 'REJECTED') AND "reviewedAt" IS NOT NULL AND "reviewerId" IS NOT NULL)
  ),
  CONSTRAINT "perfume_research_rights_review_ck" CHECK (
    ("status" = 'VERIFIED' AND "rightsConfirmed") OR
    ("status" IN ('PENDING', 'REJECTED') AND NOT "rightsConfirmed")
  ),
  CONSTRAINT "PerfumeResearchRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId")
    REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PerfumeResearchRecord_identity_key"
  ON "PerfumeResearchRecord"("brandKey", "perfumeKey", "sourceUrl", "retrievedAt");

CREATE INDEX "PerfumeResearchRecord_status_brandKey_perfumeKey_idx"
  ON "PerfumeResearchRecord"("status", "brandKey", "perfumeKey");
